const path = require('path');
const bm = require('../assets/beatmaps/beat_de_tohi_normal.json');
const notes = bm.notes.map((n,i)=>({id:`${bm.song_id}-${bm.difficulty_id}-${i}`,lane:n.lane,hitTime:n.time_ms+bm.offset_ms,status:'pending'}));
console.log('notes count',notes.length);
console.log(notes.slice(0,5));
console.log('first hitTime',notes[0].hitTime);
