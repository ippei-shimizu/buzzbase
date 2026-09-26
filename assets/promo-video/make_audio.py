"""動画のカット位置に合わせたサウンドトラックを合成する。

既製曲を使わずに済ませるため、すべて numpy で生成する。
映像のカットは 90BPM・1小節 = 80フレームのグリッドに乗せてあるので、
ここでも同じグリッドでアレンジを組み、カットが必ず小節頭に来るようにしている。
カットの frame を変えたら CUTS と TOTAL_FRAMES を直して流し直す。
"""

import subprocess
import wave

import numpy as np

SAMPLE_RATE = 48000
FPS = 30
TOTAL_FRAMES = 1040
BPM = 90
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 13

CUTS = [0, 60, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880]
MONTAGE_BARS = range(3, 10)
CTA_BAR = 11

DURATION = TOTAL_FRAMES / FPS
TOTAL_SAMPLES = int(DURATION * SAMPLE_RATE)

CHORDS = {
    "Am": {"bass": 110.00, "tones": [220.00, 261.63, 329.63, 440.00]},
    "F": {"bass": 87.31, "tones": [174.61, 220.00, 261.63, 349.23]},
    "C": {"bass": 130.81, "tones": [196.00, 261.63, 329.63, 392.00]},
    "G": {"bass": 98.00, "tones": [196.00, 246.94, 293.66, 392.00]},
}
PROGRESSION = [None, None, "Am", "Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"]

ARP_PATTERNS = [
    [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2],
    [3, 2, 1, 0, 1, 2, 3, 2, 3, 2, 1, 0, 0, 1, 2, 3],
]

rng = np.random.default_rng(1988)


def times(length):
    return np.arange(length) / SAMPLE_RATE


def decay(length, tau):
    return np.exp(-times(length) / tau)


def lowpass(signal, cutoff):
    """1極ローパス。cutoff はスカラーか signal と同じ長さの配列"""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=np.float64), signal.shape)
    alpha = 1.0 - np.exp(-2.0 * np.pi * cutoff / SAMPLE_RATE)
    out = np.empty_like(signal)
    state = 0.0
    for index in range(len(signal)):
        state += alpha[index] * (signal[index] - state)
        out[index] = state
    return out


def add(buffer, signal, at_seconds):
    start = int(at_seconds * SAMPLE_RATE)
    if start >= TOTAL_SAMPLES or start < 0:
        return
    end = min(TOTAL_SAMPLES, start + len(signal))
    buffer[start:end] += signal[: end - start]


def kick(strength=1.0):
    length = int(0.62 * SAMPLE_RATE)
    t = times(length)
    sweep = 118 * np.exp(-t / 0.045) + 46
    body = np.sin(2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE) * decay(length, 0.20)
    click = rng.normal(0, 1, length) * decay(length, 0.006) * 0.28
    return (body + click) * strength


def snare(strength=1.0):
    length = int(0.36 * SAMPLE_RATE)
    noise = rng.normal(0, 1, length)
    body = (lowpass(noise, 6500) - lowpass(noise, 260)) * decay(length, 0.11)
    tone = np.sin(2 * np.pi * 186 * times(length)) * decay(length, 0.07) * 0.32
    return (body + tone) * 0.62 * strength


def hat(strength=1.0, open_hat=False):
    length = int((0.20 if open_hat else 0.07) * SAMPLE_RATE)
    noise = rng.normal(0, 1, length)
    body = noise - lowpass(noise, 7200)
    return body * decay(length, 0.11 if open_hat else 0.016) * 0.24 * strength


def bass(freq, seconds, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    wave_form = (
        np.sin(2 * np.pi * freq * t)
        + 0.34 * np.sin(2 * np.pi * freq * 2 * t)
        + 0.12 * np.sin(2 * np.pi * freq * 3 * t)
    )
    attack = np.clip(t / 0.006, 0, 1)
    return wave_form * attack * decay(length, seconds * 0.55) * 0.40 * strength


def pluck(freq, seconds, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    wave_form = sum(
        np.sin(2 * np.pi * freq * harmonic * t) / (harmonic**1.7)
        for harmonic in (1, 2, 3, 4, 5)
    )
    attack = np.clip(t / 0.003, 0, 1)
    return wave_form * attack * decay(length, 0.13) * 0.30 * strength


def pad(freqs, seconds, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    voices = sum(
        np.sin(2 * np.pi * freq * t) + np.sin(2 * np.pi * freq * 1.004 * t)
        for freq in freqs
    )
    swell = np.clip(t / 0.5, 0, 1) * np.clip((seconds - t) / 0.8, 0, 1)
    return voices * swell * 0.055 * strength


def impact(strength=1.0):
    length = int(1.2 * SAMPLE_RATE)
    t = times(length)
    sweep = 96 * np.exp(-t / 0.10) + 40
    body = np.sin(2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE) * decay(length, 0.30)
    noise = rng.normal(0, 1, length)
    transient = (noise - lowpass(noise, 900)) * decay(length, 0.03) * 0.45
    tail = lowpass(noise, 300) * decay(length, 0.5) * 0.20
    return (body * 0.85 + transient + tail) * strength


def whoosh(seconds=0.46, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    noise = rng.normal(0, 1, length)
    cutoff = 380 + 6400 * (t / seconds) ** 2
    band = lowpass(noise, cutoff) - lowpass(noise, 230)
    swell = (t / seconds) ** 2.4
    fall = np.clip(1 - (t - seconds * 0.9) / (seconds * 0.1), 0, 1)
    return band * swell * fall * strength


def riser(seconds=1.6, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    noise = rng.normal(0, 1, length)
    cutoff = 300 + 7200 * (t / seconds) ** 3
    air = (lowpass(noise, cutoff) - lowpass(noise, 200)) * (t / seconds) ** 2
    glide = 170 * np.exp(3.1 * t / seconds)
    tone = np.sin(2 * np.pi * np.cumsum(glide) / SAMPLE_RATE) * (t / seconds) ** 3
    return (air * 0.85 + tone * 0.26) * strength


drums = np.zeros(TOTAL_SAMPLES)
tonal = np.zeros(TOTAL_SAMPLES)
effects = np.zeros(TOTAL_SAMPLES)
kick_times = []

# 小節ごとに鳴らすパートを足していき、モンタージュの中で積み上がるようにする
LAYERS = {
    "kick": 2,
    "arp": 3,
    "snare": 5,
    "hats": 5,
    "arp16": 6,
    "ghost": 7,
    "openhat": 7,
}
# 小節ごとの音量。前半を抑えて締めに向かって上げる
SECTION_GAIN = [0.70, 0.52, 0.80, 0.84, 0.88, 0.94, 0.97, 1.00, 1.00, 1.04, 1.09, 1.12, 1.06]


def playing(part, bar, last_bar):
    return LAYERS[part] <= bar <= last_bar


def place_kick(at, strength=1.0):
    add(drums, kick(strength), at)
    kick_times.append(at)


GROOVE_LAST_BAR = 10

for bar in range(BARS):
    bar_at = bar * BAR
    name = PROGRESSION[bar]
    chord = CHORDS[name] if name else None
    in_cta = bar >= CTA_BAR

    if bar == 0:
        add(effects, impact(0.8), 0.0)
        add(tonal, pad([110.0, 164.81], BAR * 2, 0.8), 0.0)
    if bar == 1:
        place_kick(bar_at + BEAT * 2, 0.7)

    if chord and not in_cta:
        if playing("kick", bar, GROOVE_LAST_BAR):
            place_kick(bar_at, 1.0)
            place_kick(bar_at + BEAT * 2, 0.92)
        if playing("ghost", bar, GROOVE_LAST_BAR) and bar % 2 == 1:
            place_kick(bar_at + BEAT * 2.5, 0.5)

        add(tonal, bass(chord["bass"], BEAT * 0.9), bar_at)
        if bar >= LAYERS["arp"]:
            for offset in (0.5, 1.5, 2.0, 3.0, 3.5):
                add(tonal, bass(chord["bass"], BEAT * 0.45, 0.85), bar_at + BEAT * offset)

        if playing("snare", bar, GROOVE_LAST_BAR):
            add(drums, snare(1.0), bar_at + BEAT)
            add(drums, snare(1.0), bar_at + BEAT * 3)

        if playing("hats", bar, GROOVE_LAST_BAR):
            for step in range(8):
                accent = 1.0 if step % 2 else 0.55
                open_hat = step == 7 and playing("openhat", bar, GROOVE_LAST_BAR) and bar % 2 == 1
                add(drums, hat(accent, open_hat=open_hat), bar_at + BEAT * step / 2)

        if playing("arp", bar, GROOVE_LAST_BAR):
            sixteenths = playing("arp16", bar, GROOVE_LAST_BAR)
            pattern = ARP_PATTERNS[bar % 2]
            for step, index in enumerate(pattern):
                if not sixteenths and step % 2:
                    continue
                tone = chord["tones"][index]
                if step % 8 >= 4:
                    tone *= 2
                accent = 0.95 if step % 4 == 0 else 0.6
                add(tonal, pluck(tone, 0.32, accent), bar_at + BEAT * step / 4)

    # 区切りの前にフィルを入れて、同じ小節の繰り返しに聞こえないようにする
    if bar in (6, 9, 10):
        for step in range(4):
            add(drums, snare(0.5 + step * 0.22), bar_at + BEAT * 3 + BEAT * step / 4)

    if in_cta and chord:
        place_kick(bar_at, 1.0)
        place_kick(bar_at + BEAT * 2, 0.8)
        add(tonal, pad([chord["bass"], *chord["tones"][:3]], BAR * 1.1, 1.15), bar_at)
        add(tonal, bass(chord["bass"], BEAT * 1.6), bar_at)
        for step in (0, 2, 4, 6):
            add(tonal, pluck(chord["tones"][step % len(chord["tones"])] * 2, 0.4, 0.55), bar_at + BEAT * step / 2)

add(effects, riser(BAR, 0.7), MONTAGE_BARS.start * BAR - BAR)
add(effects, riser(BAR, 0.85), CTA_BAR * BAR - BAR)
add(drums, hat(1.3, open_hat=True), CTA_BAR * BAR)
add(effects, impact(0.5), (BARS - 1) * BAR)

for index, cut in enumerate(CUTS):
    at = cut / FPS
    if index > 0:
        add(effects, whoosh(0.46, 0.30), max(0.0, at - 0.42))
    is_payoff = cut == CTA_BAR * BAR * FPS
    add(effects, impact(0.62 if index < 3 else 0.75 if is_payoff else 0.34), at)

# キックのたびに音程パートを軽く沈ませて、拍の輪郭を出す
duck = np.ones(TOTAL_SAMPLES)
dip_length = int(0.26 * SAMPLE_RATE)
dip = 1 - 0.34 * np.exp(-times(dip_length) / 0.07)
for at in kick_times:
    start = int(at * SAMPLE_RATE)
    end = min(TOTAL_SAMPLES, start + dip_length)
    if start < TOTAL_SAMPLES:
        duck[start:end] = np.minimum(duck[start:end], dip[: end - start])

section = np.interp(
    times(TOTAL_SAMPLES),
    [bar * BAR for bar in range(BARS)],
    SECTION_GAIN,
)

mix = (drums * 1.15 + tonal * duck * 1.2 + effects * 0.8) * section
mix *= np.clip((DURATION - times(TOTAL_SAMPLES)) / 1.2, 0, 1)

peak = np.max(np.abs(mix))
mix = np.tanh(mix / max(peak, 1e-9) * 3.0) * 0.92

delay = 260
delayed = np.concatenate([np.zeros(delay), mix[:-delay]])
stereo = np.stack([mix, mix * 0.74 + delayed * 0.26], axis=1)

pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
with wave.open("out/reel.wav", "wb") as handle:
    handle.setnchannels(2)
    handle.setsampwidth(2)
    handle.setframerate(SAMPLE_RATE)
    handle.writeframes(pcm.tobytes())

subprocess.run(
    # remotion 同梱の ffmpeg は拡張子から m4a を解決できないので -f mp4 を明示する
    ["npx", "remotion", "ffmpeg", "-i", "out/reel.wav", "-c:a", "aac", "-b:a", "160k",
     "-f", "mp4", "-y", "public/audio/reel.m4a"],
    check=True,
    capture_output=True,
)
print(f"public/audio/reel.m4a ({DURATION:.2f}s / {BPM}BPM / {BARS}小節)")
