export interface AudioMixer {
  outputTrack: MediaStreamTrack | null;
  micAnalyser: AnalyserNode | null;
  setMicGain: (value: number) => void;
  setSystemAudioGain: (value: number) => void;
  close: () => Promise<void>;
}

interface CreateAudioMixerOptions {
  systemAudioTrack: MediaStreamTrack | null;
  micTrack: MediaStreamTrack | null;
  micGain: number;
  systemAudioGain: number;
}

const GAIN_RAMP_SECONDS = 0.01;

export function createAudioMixer(
  options: CreateAudioMixerOptions
): AudioMixer | null {
  const { systemAudioTrack, micTrack, micGain, systemAudioGain } = options;

  if (!systemAudioTrack && !micTrack) {
    return null;
  }

  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();

  let systemGainNode: GainNode | null = null;
  if (systemAudioTrack) {
    const source = context.createMediaStreamSource(
      new MediaStream([systemAudioTrack])
    );
    systemGainNode = context.createGain();
    systemGainNode.gain.value = systemAudioGain;
    source.connect(systemGainNode).connect(destination);
  }

  let micGainNode: GainNode | null = null;
  let micAnalyser: AnalyserNode | null = null;
  if (micTrack) {
    const source = context.createMediaStreamSource(
      new MediaStream([micTrack])
    );
    micGainNode = context.createGain();
    micGainNode.gain.value = micGain;
    micAnalyser = context.createAnalyser();
    micAnalyser.fftSize = 512;
    source.connect(micGainNode);
    micGainNode.connect(micAnalyser);
    micAnalyser.connect(destination);
  }

  void context.resume();

  return {
    outputTrack: destination.stream.getAudioTracks()[0] ?? null,
    micAnalyser,
    setMicGain(value: number) {
      micGainNode?.gain.setTargetAtTime(
        value,
        context.currentTime,
        GAIN_RAMP_SECONDS
      );
    },
    setSystemAudioGain(value: number) {
      systemGainNode?.gain.setTargetAtTime(
        value,
        context.currentTime,
        GAIN_RAMP_SECONDS
      );
    },
    async close() {
      if (context.state !== "closed") {
        await context.close();
      }
    },
  };
}
