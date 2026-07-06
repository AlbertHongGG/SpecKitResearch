function test() { console.log('hello'); }
test();
require('v8').takeCoverage();
console.log('Took coverage manually');
// Simulate hard kill that would normally break c8
process.kill(process.pid, 'SIGKILL');
