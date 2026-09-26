"""動画のカット位置に合わせた効果音つきのサウンドベッドを合成する。

既製曲を使わずに済ませるため、すべて numpy で生成する。
カットの frame を変えたら CUTS を直して流し直す。
"""

import subprocess
import wave

import numpy as np

SAMPLE_RATE = 48000
FPS = 30
TOTAL_FRAMES = 1259
CUTS = [0, 45, 140, 215, 335, 443, 551, 665, 773, 881, 995, 1109]
LOGO_AT = 140 / FPS
CTA_AT = 1109 / FPS

DURATION = TOTAL_FRAMES / FPS
TOTAL_SAMPLES = int(DURATION * SAMPLE_RATE)

rng = np.random.default_rng(1988)


def blank():
    return np.zeros(TOTAL_SAMPLES, dtype=np.float64)


def add(buffer, signal, at_seconds):
    start = int(at_seconds * SAMPLE_RATE)
    if start >= TOTAL_SAMPLES:
        return
    end = min(TOTAL_SAMPLES, start + len(signal))
    buffer[start:end] += signal[: end - start]


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


def impact(strength=1.0):
    length = int(1.1 * SAMPLE_RATE)
    t = times(length)
    sweep = 92 * np.exp(-t / 0.10) + 42
    body = np.sin(2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE) * decay(length, 0.24)
    noise = rng.normal(0, 1, length)
    transient = (noise - lowpass(noise, 900)) * decay(length, 0.028) * 0.5
    tail = lowpass(noise, 320) * decay(length, 0.42) * 0.22
    return (body * 0.9 + transient + tail) * strength


def whoosh(length_seconds=0.5, strength=1.0):
    length = int(length_seconds * SAMPLE_RATE)
    t = times(length)
    noise = rng.normal(0, 1, length)
    cutoff = 380 + 6200 * (t / length_seconds) ** 2
    band = lowpass(noise, cutoff) - lowpass(noise, 220)
    swell = (t / length_seconds) ** 2.4
    fall = np.clip(1 - (t - length_seconds * 0.92) / (length_seconds * 0.08), 0, 1)
    return band * swell * fall * strength


def riser(length_seconds=1.6):
    length = int(length_seconds * SAMPLE_RATE)
    t = times(length)
    noise = rng.normal(0, 1, length)
    cutoff = 300 + 7000 * (t / length_seconds) ** 3
    air = (lowpass(noise, cutoff) - lowpass(noise, 200)) * (t / length_seconds) ** 2
    glide = 180 * np.exp(3.0 * t / length_seconds)
    tone = np.sin(2 * np.pi * np.cumsum(glide) / SAMPLE_RATE) * (t / length_seconds) ** 3
    return air * 0.9 + tone * 0.28


def tick():
    length = int(0.10 * SAMPLE_RATE)
    noise = rng.normal(0, 1, length)
    return (noise - lowpass(noise, 1800)) * decay(length, 0.016) * 0.34


def drone():
    t = times(TOTAL_SAMPLES)
    pulse = 0.62 + 0.38 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 0.6 - np.pi / 2))
    root = np.sin(2 * np.pi * 55 * t) * pulse
    fifth = np.sin(2 * np.pi * 82.4 * t) * pulse * 0.45
    fifth *= np.clip((t - LOGO_AT) / 1.2, 0, 1)
    body = np.clip((t - 0.6) / 1.4, 0, 1)
    return (root + fifth) * body * 0.30


def chord():
    length = int((DURATION - CTA_AT) * SAMPLE_RATE)
    t = times(length)
    swell = np.clip(t / 0.9, 0, 1) * np.clip((DURATION - CTA_AT - t) / 1.0, 0, 1)
    voices = sum(np.sin(2 * np.pi * freq * t) for freq in (110.0, 164.8, 220.0, 329.6))
    return voices * swell * 0.11


bed = drone()
add(bed, chord(), CTA_AT)

# 一定の刻み。カットが等間隔ではないので拍を強調しすぎない
step = 0.3
position = 1.2
while position < DURATION - 0.4:
    add(bed, tick() * (0.7 if round(position / step) % 2 else 1.0), position)
    position += step

for index, cut in enumerate(CUTS):
    at = cut / FPS
    if index > 0:
        add(bed, whoosh(0.5, 0.42), max(0.0, at - 0.46))
    add(bed, impact(1.0 if index in (0, 1, 2) else 0.72), at)

add(bed, riser(1.6), CTA_AT - 1.6)

fade_out = np.clip((DURATION - times(TOTAL_SAMPLES)) / 0.9, 0, 1)
bed *= fade_out

peak = np.max(np.abs(bed))
bed = np.tanh(bed / max(peak, 1e-9) * 1.25) * 0.89

# ノイズ成分だけ数サンプルずらして左右に広げる
delay = 240
right = np.concatenate([np.zeros(delay), bed[:-delay]])
stereo = np.stack([bed, bed * 0.72 + right * 0.28], axis=1)

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
print(f"public/audio/reel.m4a ({DURATION:.2f}s)")
