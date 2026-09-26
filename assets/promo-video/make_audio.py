"""動画のカット位置に合わせたサウンドトラックを合成する。

既製曲を使わずに済ませるため、すべて numpy で生成する。
映像のカットは 90BPM・1小節 = 80フレームのグリッドに乗せてあるので、
ここでも同じグリッドでアレンジを組み、カットが必ず拍に来るようにしている。

カットの frame を変えたら TRACKS の cuts と frames を直して流し直す。
"""

import subprocess
import wave

import numpy as np

SAMPLE_RATE = 48000
FPS = 30
BPM = 90
BEAT = 60 / BPM
BAR = BEAT * 4

CHORDS = {
    "Am": {"bass": 110.00, "tones": [220.00, 261.63, 329.63, 440.00]},
    "F": {"bass": 87.31, "tones": [174.61, 220.00, 261.63, 349.23]},
    "C": {"bass": 130.81, "tones": [196.00, 261.63, 329.63, 392.00]},
    "G": {"bass": 98.00, "tones": [196.00, 246.94, 293.66, 392.00]},
}

ARP_PATTERNS = [
    [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2],
    [3, 2, 1, 0, 1, 2, 3, 2, 3, 2, 1, 0, 0, 1, 2, 3],
]

TRACKS = [
    {
        "name": "reel",
        "frames": 1040,
        "cuts": [0, 60, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880],
        "progression": [None, None, "Am", "Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"],
        # パートを足し始める小節。積み上げてモンタージュを盛り上げる
        "layers": {"kick": 2, "arp": 3, "snare": 5, "hats": 5, "arp16": 6, "ghost": 7, "openhat": 7},
        "fills": (6, 9, 10),
        "riser_bar": 3,
        "groove_last_bar": 10,
        "cta_bar": 11,
        "gain": [0.70, 0.52, 0.80, 0.84, 0.88, 0.94, 0.97, 1.00, 1.00, 1.04, 1.09, 1.12, 1.06],
    },
    {
        "name": "story",
        "frames": 960,
        "cuts": [0, 60, 140, 200, 260, 320, 400, 480, 560, 640, 720, 800],
        "progression": [None, "Am", "Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"],
        # 1カット目から動く構成なので、こちらは早い小節からフルで鳴らす
        "layers": {"kick": 1, "arp": 1, "snare": 2, "hats": 2, "arp16": 3, "ghost": 4, "openhat": 4},
        "fills": (4, 6, 9),
        "riser_bar": 2,
        "groove_last_bar": 9,
        "cta_bar": 10,
        "gain": [0.76, 0.90, 0.94, 0.98, 1.02, 1.05, 1.00, 1.05, 1.08, 1.12, 1.12, 1.04],
    },
    {
        "name": "journey",
        "frames": 1200,
        "cuts": [0, 60, 100, 300, 440, 620, 760, 880, 1040],
        "progression": [None, "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"],
        # ワンカットで場面が割れないぶん、音側は早い小節から動かし続ける
        "layers": {"kick": 1, "arp": 1, "snare": 2, "hats": 2, "arp16": 3, "ghost": 4, "openhat": 4},
        "fills": (5, 8, 11),
        "riser_bar": 2,
        "groove_last_bar": 12,
        "cta_bar": 13,
        "gain": [0.72, 0.90, 0.94, 0.98, 1.00, 1.04, 1.00, 1.04, 1.06, 1.02, 1.06, 1.08, 1.10, 1.12, 1.04],
    },
    {
        "name": "runway",
        "frames": 1120,
        "cuts": [0, 958],
        # 2小節で1コード。和声の動きを遅くするとエディトリアルな落ち着きが出る
        "progression": [None, "Am", "Am", "F", "F", "C", "C", "G", "G", "Am", "F", "C", "F", "C"],
        # 99 は「最後まで鳴らさない」の意味。スネアとハイハットを外して静かに保つ
        "layers": {"kick": 2, "arp": 4, "snare": 99, "hats": 99, "arp16": 99, "ghost": 99, "openhat": 99},
        "fills": (),
        "riser_bar": 4,
        "groove_last_bar": 11,
        "cta_bar": 12,
        "gain": [0.58, 0.64, 0.70, 0.76, 0.80, 0.84, 0.88, 0.90, 0.92, 0.94, 0.96, 1.00, 1.02, 0.90],
    },
    {
        "name": "pop",
        "frames": 880,
        "cuts": [0, 120, 280, 420, 580, 720],
        # 長調にしてアルペジオを1オクターブ上げる。それだけで明るく鳴る
        "progression": ["C", "G", "Am", "F", "C", "G", "Am", "F", "C", "F", "C"],
        "layers": {"kick": 0, "arp": 0, "snare": 1, "hats": 1, "arp16": 2, "ghost": 3, "openhat": 3},
        "arp_octave": 2,
        "fills": (3, 7, 8),
        "riser_bar": 1,
        "groove_last_bar": 8,
        "cta_bar": 9,
        "gain": [0.95, 1.00, 1.02, 1.05, 1.00, 1.04, 1.06, 1.08, 1.10, 1.12, 1.02],
    },
    {
        "name": "play",
        "frames": 1040,
        "cuts": [0, 160, 360, 520, 680, 840],
        "progression": [None, "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "F", "F", "C"],
        "layers": {"kick": 1, "arp": 1, "snare": 2, "hats": 2, "arp16": 3, "ghost": 4, "openhat": 4},
        "fills": (4, 7, 10),
        "riser_bar": 2,
        "groove_last_bar": 10,
        "cta_bar": 11,
        "gain": [0.74, 0.88, 0.92, 0.96, 1.00, 1.02, 1.00, 1.04, 1.06, 1.08, 1.10, 1.12, 1.02],
    },
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
    return wave_form * np.clip(t / 0.006, 0, 1) * decay(length, seconds * 0.55) * 0.40 * strength


def pluck(freq, seconds, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    wave_form = sum(
        np.sin(2 * np.pi * freq * harmonic * t) / (harmonic**1.7) for harmonic in (1, 2, 3, 4, 5)
    )
    return wave_form * np.clip(t / 0.003, 0, 1) * decay(length, 0.13) * 0.30 * strength


def pad(freqs, seconds, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    voices = sum(
        np.sin(2 * np.pi * freq * t) + np.sin(2 * np.pi * freq * 1.004 * t) for freq in freqs
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
    band = lowpass(noise, 380 + 6400 * (t / seconds) ** 2) - lowpass(noise, 230)
    fall = np.clip(1 - (t - seconds * 0.9) / (seconds * 0.1), 0, 1)
    return band * (t / seconds) ** 2.4 * fall * strength


def riser(seconds=1.6, strength=1.0):
    length = int(seconds * SAMPLE_RATE)
    t = times(length)
    noise = rng.normal(0, 1, length)
    air = (lowpass(noise, 300 + 7200 * (t / seconds) ** 3) - lowpass(noise, 200)) * (t / seconds) ** 2
    glide = 170 * np.exp(3.1 * t / seconds)
    tone = np.sin(2 * np.pi * np.cumsum(glide) / SAMPLE_RATE) * (t / seconds) ** 3
    return (air * 0.85 + tone * 0.26) * strength


def render_track(config):
    global rng
    rng = np.random.default_rng(1988)

    duration = config["frames"] / FPS
    total = int(duration * SAMPLE_RATE)
    progression = config["progression"]
    layers = config["layers"]
    bars = len(progression)
    groove_last = config["groove_last_bar"]
    cta_bar = config["cta_bar"]

    drums = np.zeros(total)
    tonal = np.zeros(total)
    effects = np.zeros(total)
    kick_times = []

    def add(buffer, signal, at_seconds):
        start = int(at_seconds * SAMPLE_RATE)
        if start >= total or start < 0:
            return
        end = min(total, start + len(signal))
        buffer[start:end] += signal[: end - start]

    def playing(part, bar):
        return layers[part] <= bar <= groove_last

    def place_kick(at, strength=1.0):
        add(drums, kick(strength), at)
        kick_times.append(at)

    for bar in range(bars):
        bar_at = bar * BAR
        name = progression[bar]
        chord = CHORDS[name] if name else None
        in_cta = bar >= cta_bar

        if bar == 0:
            add(effects, impact(0.8), 0.0)
            add(tonal, pad([110.0, 164.81], BAR * 2, 0.8), 0.0)

        # コードが入る前の小節は心拍のようなキックだけ置く
        if bar > 0 and name is None:
            place_kick(bar_at + BEAT * 2, 0.7)

        if chord and not in_cta:
            if playing("kick", bar):
                place_kick(bar_at, 1.0)
                place_kick(bar_at + BEAT * 2, 0.92)
            if playing("ghost", bar) and bar % 2 == 1:
                place_kick(bar_at + BEAT * 2.5, 0.5)

            add(tonal, bass(chord["bass"], BEAT * 0.9), bar_at)
            if bar >= layers["arp"]:
                for offset in (0.5, 1.5, 2.0, 3.0, 3.5):
                    add(tonal, bass(chord["bass"], BEAT * 0.45, 0.85), bar_at + BEAT * offset)

            if playing("snare", bar):
                add(drums, snare(1.0), bar_at + BEAT)
                add(drums, snare(1.0), bar_at + BEAT * 3)

            if playing("hats", bar):
                for step in range(8):
                    open_hat = step == 7 and playing("openhat", bar) and bar % 2 == 1
                    add(drums, hat(1.0 if step % 2 else 0.55, open_hat), bar_at + BEAT * step / 2)

            if playing("arp", bar):
                sixteenths = playing("arp16", bar)
                pattern = ARP_PATTERNS[bar % 2]
                for step, index in enumerate(pattern):
                    if not sixteenths and step % 2:
                        continue
                    tone = chord["tones"][index] * (2 if step % 8 >= 4 else 1) * config.get("arp_octave", 1)
                    add(tonal, pluck(tone, 0.32, 0.95 if step % 4 == 0 else 0.6), bar_at + BEAT * step / 4)

        # 区切りの前にフィルを入れて、同じ小節の繰り返しに聞こえないようにする
        if bar in config["fills"]:
            for step in range(4):
                add(drums, snare(0.5 + step * 0.22), bar_at + BEAT * 3 + BEAT * step / 4)

        if in_cta and chord:
            place_kick(bar_at, 1.0)
            place_kick(bar_at + BEAT * 2, 0.8)
            add(tonal, pad([chord["bass"], *chord["tones"][:3]], BAR * 1.1, 1.15), bar_at)
            add(tonal, bass(chord["bass"], BEAT * 1.6), bar_at)
            for step in (0, 2, 4, 6):
                add(tonal, pluck(chord["tones"][step % 4] * 2, 0.4, 0.55), bar_at + BEAT * step / 2)

    add(effects, riser(BAR, 0.7), (config["riser_bar"] - 1) * BAR)
    add(effects, riser(BAR, 0.85), cta_bar * BAR - BAR)
    add(drums, hat(1.3, open_hat=True), cta_bar * BAR)
    add(effects, impact(0.5), (bars - 1) * BAR)

    payoff_frame = round(cta_bar * BAR * FPS)
    for index, cut in enumerate(config["cuts"]):
        at = cut / FPS
        if index > 0:
            add(effects, whoosh(0.46, 0.30), max(0.0, at - 0.42))
        add(effects, impact(0.62 if index < 3 else 0.75 if cut == payoff_frame else 0.34), at)

    # キックのたびに音程パートを軽く沈ませて、拍の輪郭を出す
    duck = np.ones(total)
    dip_length = int(0.26 * SAMPLE_RATE)
    dip = 1 - 0.34 * np.exp(-times(dip_length) / 0.07)
    for at in kick_times:
        start = int(at * SAMPLE_RATE)
        end = min(total, start + dip_length)
        if start < total:
            duck[start:end] = np.minimum(duck[start:end], dip[: end - start])

    section = np.interp(times(total), [bar * BAR for bar in range(bars)], config["gain"])

    mix = (drums * 1.15 + tonal * duck * 1.2 + effects * 0.8) * section
    mix *= np.clip((duration - times(total)) / 1.2, 0, 1)
    mix = np.tanh(mix / max(np.max(np.abs(mix)), 1e-9) * 3.0) * 0.92

    delay = 260
    delayed = np.concatenate([np.zeros(delay), mix[:-delay]])
    stereo = np.stack([mix, mix * 0.74 + delayed * 0.26], axis=1)

    wav_path = f"out/{config['name']}.wav"
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(wav_path, "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm.tobytes())

    subprocess.run(
        # remotion 同梱の ffmpeg は拡張子から m4a を解決できないので -f mp4 を明示する
        ["npx", "remotion", "ffmpeg", "-i", wav_path, "-c:a", "aac", "-b:a", "160k",
         "-f", "mp4", "-y", f"public/audio/{config['name']}.m4a"],
        check=True,
        capture_output=True,
    )
    print(f"public/audio/{config['name']}.m4a ({duration:.2f}s / {bars}小節)")


for track in TRACKS:
    render_track(track)
