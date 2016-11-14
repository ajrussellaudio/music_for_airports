const OCTAVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SAMPLE_LIBRARY = {
  'Grand Piano': [
    { note: 'A', octave: 4, file: 'Samples/Grand Piano/piano-f-a4.wav' },
    { note: 'A',  octave: 5, file: 'Samples/Grand Piano/piano-f-a5.wav' },
    { note: 'A',  octave: 6, file: 'Samples/Grand Piano/piano-f-a6.wav' },
    { note: 'C',  octave: 4, file: 'Samples/Grand Piano/piano-f-c4.wav' },
    { note: 'C',  octave: 5, file: 'Samples/Grand Piano/piano-f-c5.wav' },
    { note: 'C',  octave: 6, file: 'Samples/Grand Piano/piano-f-c6.wav' },
    { note: 'D#',  octave: 4, file: 'Samples/Grand Piano/piano-f-d#4.wav' },
    { note: 'D#',  octave: 5, file: 'Samples/Grand Piano/piano-f-d#5.wav' },
    { note: 'D#',  octave: 6, file: 'Samples/Grand Piano/piano-f-d#6.wav' },
    { note: 'F#',  octave: 4, file: 'Samples/Grand Piano/piano-f-f#4.wav' },
    { note: 'F#',  octave: 5, file: 'Samples/Grand Piano/piano-f-f#5.wav' },
    { note: 'F#',  octave: 6, file: 'Samples/Grand Piano/piano-f-f#6.wav' }
  ]
}

let audioContext = new AudioContext();

function flatToSharp( note ) {
  let enharmonics = {
    'Bb': 'A#',
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
  };
  if( enharmonics[note] ) return enharmonics[note];
  return note;
}

function noteValue( note, octave ) {
  return octave * 12 + OCTAVE.indexOf(note);
}

function getNoteDistance( note1, octave1, note2, octave2 ) {
  return noteValue( note1, octave1 ) - noteValue( note2, octave2 );
}

function getNearestSample( sampleBank, note, octave ) {
  let sortedBank = sampleBank.slice().sort((sampleA, sampleB) => {
    let distanceToA = Math.abs(getNoteDistance(note, octave, sampleA.note, sampleA.octave));
    let distanceToB = Math.abs(getNoteDistance(note, octave, sampleB.note, sampleB.octave));
    return distanceToA - distanceToB;
  });
  return sortedBank[0];
}

function fetchSample( path ) {
  return fetch(encodeURIComponent(path))
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
}

function getSample( instrument, noteAndOctave ) {
  let [, requestedNote, requestedOctave] = /^(\w[b#]?)(\d)$/.exec(noteAndOctave);
  requestedOctave = parseInt(requestedOctave, 10);
  requestedNote = flatToSharp( requestedNote );
  let sampleBank = SAMPLE_LIBRARY[instrument];
  let sample = getNearestSample(sampleBank, requestedNote, requestedOctave);
  let distance = getNoteDistance( requestedNote, requestedOctave, sample.note, sample.octave);
  return fetchSample( sample.file ).then( audioBuffer => ({
    audioBuffer: audioBuffer,
    distance: distance
  }));
}

function playSample(instrument, note, destination, delaySeconds = 0) {
  getSample(instrument, note).then(({audioBuffer, distance}) => {
    let playbackRate = Math.pow(2, distance / 12);
    let bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.playbackRate.value = playbackRate;
    bufferSource.connect( destination );
    bufferSource.start( audioContext.currentTime + delaySeconds );
  })
}

function startLoop(instrument, note, destination, loopLengthSeconds, delaySeconds) {
  playSample( instrument, note, destination, delaySeconds );
  setInterval(
    () => playSample( instrument, note, destination, delaySeconds ),
    loopLengthSeconds * 1000
  );
}

fetchSample('AirportTerminal.wav').then(convolverBuffer => {
  let convolver = audioContext.createConvolver();
  convolver.buffer = convolverBuffer;
  convolver.connect( audioContext.destination );

  let notes = ['F4', 'Ab4', 'C5', 'Db5', 'Eb5', 'F5', 'Ab5'];

  notes.forEach( note => {
    let delay = Math.random() * 16;
    let loopLength = Math.random() * 6 + 17;
    startLoop('Grand Piano', note, convolver, loopLength, delay);
  });
})


