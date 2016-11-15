const OCTAVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SAMPLE_LIBRARY = {
  'Harp': fillHarpLibrary()
}
  console.log(SAMPLE_LIBRARY);

let audioContext = new AudioContext();

function fillHarpLibrary() {
  let library = [];
  let notes = ['a','c','d#','f#'];
  let octaves = [2,3,4,5,6];
  notes.forEach( (note) => {
    octaves.forEach((octave) => {
      library.push({
        note: note.toUpperCase(),
        octave: octave,
        file: `cello-${note}${octave}.mp3`
      })
    })
  })
  return library;
}

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
  return fetch('Samples/' + encodeURIComponent(path))
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
    let amp = audioContext.createGain();
    bufferSource.buffer = audioBuffer;
    bufferSource.playbackRate.value = playbackRate;
    amp.gain.value = 0.1;
    amp.connect( destination );
    bufferSource.connect( amp );
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

  let notes = [ 'D2', 'A2', 'D3', 'G3', 'A3', 'C#4', 'D4' ];

  // let notes = ['F3', 'Ab3', 'C4', 'Db4', 'Eb4', 'F4', 'Ab4'];
  // let notes = [ 'B2', 'B3', 'E4', 'A4', 'B4', 'E5' ];
  // let notes = [ 'B2', 'F#3', 'A#3', 'B3', 'D#4', 'F#4' ];
  // let notes = [ 'C3', 'F4', 'Bb3', 'D4', 'Eb4', 'G3' ]

  notes.forEach( note => {
    let delay = Math.random() * 16;
    let loopLength = Math.random() * 6 + 17;
    startLoop('Harp', note, convolver, loopLength, delay);
  });
})


