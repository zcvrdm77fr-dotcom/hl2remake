export class RetroAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambience = null;
    this.unlocked = false;
    this.muted = false;
    this.noiseBuffer = null;
  }
  unlock() {
    if (this.muted) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      if (!this.context) {
        this.context = new AudioCtor();
        this.master = this.context.createGain();
        this.master.gain.value = 0.72;
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -23; compressor.knee.value = 17;
        compressor.ratio.value = 3.4; compressor.attack.value = 0.004; compressor.release.value = 0.24;
        this.master.connect(compressor).connect(this.context.destination);
        this.noiseBuffer = this.makeNoiseBuffer(2.5);
        this.startAmbience();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      this.unlocked = true;
    } catch (error) { console.warn('Audio system could not start:', error); }
  }
  makeNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0); let last = 0;
    for (let i = 0; i < length; i++) { const white = Math.random() * 2 - 1; last = last * 0.72 + white * 0.28; data[i] = last * 2.2; }
    return buffer;
  }
  startAmbience() {
    if (this.ambience || !this.context) return;
    const ctx = this.context, bed = ctx.createGain(); bed.gain.value = 0.34; bed.connect(this.master);
    const rumble = ctx.createOscillator(), rumbleGain = ctx.createGain(), rumbleFilter = ctx.createBiquadFilter();
    rumble.type = 'sawtooth'; rumble.frequency.value = 43; rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 118;
    rumbleGain.gain.value = 0.018; rumble.connect(rumbleFilter).connect(rumbleGain).connect(bed); rumble.start();
    const harmonic = ctx.createOscillator(), harmonicGain = ctx.createGain();
    harmonic.type = 'sine'; harmonic.frequency.value = 86; harmonicGain.gain.value = 0.008;
    harmonic.connect(harmonicGain).connect(bed); harmonic.start();
    const air = ctx.createBufferSource(), airFilter = ctx.createBiquadFilter(), airGain = ctx.createGain();
    air.buffer = this.noiseBuffer; air.loop = true; airFilter.type = 'lowpass'; airFilter.frequency.value = 510;
    airGain.gain.value = 0.024; air.connect(airFilter).connect(airGain).connect(bed); air.start();
    const flicker = ctx.createOscillator(), flickerGain = ctx.createGain();
    flicker.type = 'sine'; flicker.frequency.value = 2.6; flickerGain.gain.value = 0.004;
    flicker.connect(flickerGain).connect(rumbleGain.gain); flicker.start();
    this.ambience = { bed, rumble, harmonic, air, flicker };
  }
  envelope(gain, now, peak, duration, attack = 0.004) {
    gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }
  tone(frequency, duration, wave = 'triangle', volume = 0.08, slide = 0, cutoff = 8000) {
    if (!this.context || this.muted) return;
    const ctx = this.context, now = ctx.currentTime, oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    oscillator.type = wave === 'metallic' ? 'triangle' : wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(18, frequency + slide), now + duration);
    filter.type = 'lowpass'; filter.frequency.value = cutoff;
    this.envelope(gain, now, volume, duration);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration + 0.025);
  }
  noise(duration = 0.1, volume = 0.1, cutoff = 1800, resonance = 0.7, highpass = 30) {
    if (!this.context || this.muted) return;
    const ctx = this.context, now = ctx.currentTime, source = ctx.createBufferSource();
    const low = ctx.createBiquadFilter(), high = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noiseBuffer; low.type = 'lowpass'; low.frequency.setValueAtTime(cutoff, now); low.Q.value = resonance;
    high.type = 'highpass'; high.frequency.value = highpass;
    this.envelope(gain, now, volume, duration);
    source.connect(high).connect(low).connect(gain).connect(this.master);
    source.start(now, Math.random() * 0.8, duration);
  }
  play(name, intensity = 1) {
    if (!this.unlocked || this.muted || !this.context) return;
    const scale = Math.max(0.15, Math.min(1.8, intensity));
    switch (name) {
      case 'footstep':
        this.noise(.075, .105 * scale, 420, 1.1, 42); this.tone(91 + Math.random() * 18, .09, 'triangle', .045 * scale, -55, 240); this.noise(.035, .035 * scale, 1500, .5, 180); break;
      case 'crowbar':
        this.noise(.13, .20 * scale, 3000, 2.2, 120); this.tone(740, .23, 'metallic', .04 * scale, -260, 3400); this.tone(1180, .15, 'sine', .032 * scale, -380, 5000); this.tone(110, .11, 'triangle', .10 * scale, -80, 400); break;
      case 'pistol':
        this.noise(.105, .34 * scale, 5400, .9, 450); this.noise(.17, .24 * scale, 780, 1.4, 35); this.tone(136, .14, 'square', .17 * scale, -92, 900); this.tone(880, .055, 'triangle', .035 * scale, -480, 2800); this.noise(.075, .08 * scale, 2300, 1.7, 650); break;
      case 'radio':
        this.noise(.17, .075 * scale, 3600, 1.5, 420); this.tone(690, .085, 'triangle', .025 * scale, -250, 1800); this.noise(.07, .035 * scale, 2600, 1.3, 900); break;
      case 'impact':
      case 'hurt':
        this.noise(.105, .14 * scale, 630, 1.8, 28); this.tone(76, .17, 'triangle', .12 * scale, -48, 260); break;
      case 'pickup':
        this.tone(510, .075, 'sine', .055 * scale, 210, 2200); this.tone(780, .12, 'triangle', .035 * scale, -120, 3200); this.noise(.035, .025 * scale, 4200, .7, 1200); break;
      case 'door':
        this.noise(.72, .11 * scale, 430, 2.2, 35); this.tone(58, .8, 'sawtooth', .09 * scale, 18, 180); this.tone(190, .58, 'triangle', .04 * scale, -80, 650); this.noise(.2, .065 * scale, 1500, 1.6, 120); break;
      case 'steam':
        this.noise(.42, .13 * scale, 5200, .35, 850); this.noise(.34, .055 * scale, 1200, .8, 250); break;
      case 'monster':
        this.noise(.62, .19 * scale, 720, 2.4, 34); this.tone(82 + Math.random() * 24, .68, 'sawtooth', .12 * scale, -55, 440); this.tone(210, .31, 'triangle', .035 * scale, -110, 900); break;
      case 'tram':
        this.noise(.75, .14 * scale, 950, 2.5, 35); this.tone(62, .9, 'sawtooth', .11 * scale, 45, 230); this.tone(330, .4, 'triangle', .04 * scale, -140, 900); break;
      case 'alarm':
        this.tone(520, .42, 'sawtooth', .045 * scale, 210, 1200); this.tone(730, .42, 'triangle', .025 * scale, -120, 1800); break;
    }
  }
  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : .72, this.context.currentTime, .035);
  }
}
