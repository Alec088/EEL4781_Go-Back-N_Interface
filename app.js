// Go-Back-N simulator (sender, receiver, channel)
// Organized for clarity and teaching — well commented.

// --- Helpers & DOM ---
const $ = id => document.getElementById(id);
const log = msg => {
  const area = $('logArea');
  const time = new Date().toLocaleTimeString();
  area.textContent += `[${time}] ${msg}\n`;
  area.scrollTop = area.scrollHeight;
};

// --- Channel simulator ---
class Channel {
  constructor(delay, dropDataSet, dropAckSet) {
    this.delay = delay;
    this.dropData = dropDataSet;
    this.dropAck = dropAckSet;
  }
  sendData(packet, toReceiver) {
    // packet: {seq, payload}
    const shouldDrop = this.dropData.has(packet.seq);
    const delay = this.delay;
    const id = `D${packet.seq}-${Date.now()}`;
    showInChannel(`${packet.seq}`);
    setTimeout(() => {
      removeFromChannel();
      if (shouldDrop) {
        log(`Channel: dropped DATA ${packet.seq}`);
        return;
      }
      toReceiver(packet);
    }, delay);
  }
  sendAck(ackNum, toSender) {
    const shouldDrop = this.dropAck.has(ackNum);
    const delay = this.delay;
    showInChannel(`ACK ${ackNum}`);
    setTimeout(() => {
      removeFromChannel();
      if (shouldDrop) {
        log(`Channel: dropped ACK ${ackNum}`);
        return;
      }
      toSender(ackNum);
    }, delay);
  }
}

// --- Receiver (accepts only in-order packets) ---
class Receiver {
  constructor(K, channel) {
    this.K = K;
    this.expected = 0; // next expected seq
    this.delivered = 0;
    this.channel = channel;
  }
  onData(packet) {
    const seq = packet.seq;
    if (seq === this.expected) {
      log(`Receiver: accepted DATA ${seq}`);
      this.delivered++;
      this.expected = (this.expected + 1) % this.K;
      updateReceiver(this.expected, this.delivered);
      // send cumulative ACK for last in-order received (i.e., expected-1)
      const ackNum = (this.expected + this.K - 1) % this.K;
      this.channel.sendAck(ackNum, sender.onAck.bind(sender));
    } else {
      log(`Receiver: discarded out-of-order DATA ${seq}, expected ${this.expected}`);
      // re-send ACK for last in-order packet
      const ackNum = (this.expected + this.K - 1) % this.K;
      this.channel.sendAck(ackNum, sender.onAck.bind(sender));
    }
  }
}

// --- Sender (Go-Back-N) ---
class Sender {
  constructor(N, K, total, channel, rto=1500) {
    this.N = N; this.K = K; this.total = total; this.channel = channel; this.rto = rto;
    this.base = 0; this.nextSeq = 0; this.sentCount = 0; this.retrans = 0;
    this.timer = null; this.buffer = []; // payload placeholders
    this.unacked = new Set();
    this.timeoutCount = 0;
    this.maxTimeouts = Math.max(3, Math.ceil(this.total / 4));
    for (let i=0;i<total;i++) this.buffer.push({seq:i%K,payload:`pkt${i}`});
  }
  canSend() { return ((this.nextSeq - this.base + this.K) % this.K) < this.N && this.sentCount < this.total; }
  sendNext() {
    if (!this.canSend()) return false;
    const pktIndex = this.sentCount;
    const packet = this.buffer[pktIndex];
    log(`Sender: sending DATA ${packet.seq}`);
    this.channel.sendData(packet, receiver.onData.bind(receiver));
    this.unacked.add(packet.seq);
    this.sentCount++;
    this.nextSeq = (this.nextSeq + 1) % this.K;
    updateSender(this.base, this.nextSeq, this.unacked);
    if (!this.timer) this.startTimer();
    $('sentCount').textContent = `Sent: ${this.sentCount}`;
    return true;
  }
  startTimer() {
    this.stopTimer();
    this.timer = setTimeout(()=>this.timeout(), this.rto);
  }
  stopTimer(){ if(this.timer){clearTimeout(this.timer);this.timer=null;} }
  timeout(){
    this.timeoutCount += 1;
    if (this.timeoutCount > this.maxTimeouts) {
      log(`Sender: retransmission limit reached (${this.maxTimeouts}); stopping`);
      this.stopTimer();
      return;
    }

    log(`Sender: timeout ${this.timeoutCount}/${this.maxTimeouts} — retransmitting from base ${this.base}`);
    this.retrans += this.unacked.size;
    $('retransCount').textContent = `Retransmissions: ${this.retrans}`;
    // retransmit all unacked in window starting at base
    // For simplicity, re-send packets by scanning buffer for matching seq numbers
    for (let i=0;i<this.sentCount;i++){
      const p = this.buffer[i];
      if (this.unacked.has(p.seq)){
        log(`Sender: retransmit DATA ${p.seq}`);
        this.channel.sendData(p, receiver.onData.bind(receiver));
      }
    }
    this.startTimer();
  }
  onAck(ackNum){
    log(`Sender: received ACK ${ackNum}`);
    // cumulative ack: advance base to ackNum+1
    const newBase = (ackNum + 1) % this.K;
    // remove all seqs up to ackNum from unacked
    const removeList = [];
    for (let s of this.unacked){
      // is s in range [base, ackNum] modulo K?
      if (inRange(this.base, ackNum, s, this.K)) removeList.push(s);
    }
    removeList.forEach(s=>this.unacked.delete(s));
    this.base = newBase;
    updateSender(this.base, this.nextSeq, this.unacked);
    if (this.unacked.size===0) this.stopTimer(); else this.startTimer();
    // try to send more if buffered
    while(this.canSend()) this.sendNext();
    // finished?
    if (this.sentCount>=this.total && this.unacked.size===0) {
      log('Sender: all packets acknowledged — transmission complete');
    }
  }
}

// --- Utility functions ---
function inRange(a,b,x,K){
  // returns true if x in [a..b] in modulo K arithmetic
  if (a<=b) return x>=a && x<=b;
  return x>=a || x<=b;
}

// --- UI update helpers ---
function updateSender(base,nextSeq,unacked){
  const win = $('senderWindow'); win.innerHTML='';
  const N = parseInt($('winSize').value,10);
  for (let i=0;i<N;i++){
    const seq = (base+i) % sender.K;
    const div = document.createElement('div'); div.className='slot'; div.textContent=seq;
    if (!unacked.has(seq) && (seq < sender.nextSeq || sender.sentCount>=sender.total)) div.classList.add('acked');
    if (unacked.has(seq)) div.classList.add('sent');
    if (i===0) div.classList.add('current');
    win.appendChild(div);
  }
}
function updateReceiver(expected, delivered){
  const el = $('receiverState'); el.textContent = `expected=${expected} delivered=${delivered}`;
  $('recvCount').textContent = `Delivered: ${delivered}`;
}
function showInChannel(txt){ $('channelArea').textContent = txt; }
function removeFromChannel(){ $('channelArea').textContent = '(packets in flight)'; }

// --- Wiring UI and starting simulation ---
let sender, receiver, channel;
function parseList(s){
  if (!s) return new Set();
  return new Set(s.split(',').map(x=>parseInt(x.trim(),10)).filter(x=>!isNaN(x)));
}

function setupFromUI(){
  const N = parseInt($('winSize').value,10);
  const K = parseInt($('seqK').value,10);
  const total = parseInt($('totalPackets').value,10);
  const delay = parseInt($('delay').value,10);
  const drops = parseList($('dropData').value);
  const ackDrops = parseList($('dropAck').value);
  channel = new Channel(delay, drops, ackDrops);
  sender = new Sender(N,K,total,channel, Math.max(300, delay*3));
  receiver = new Receiver(K, channel);
  // make sender and receiver visible to callbacks
  window.sender = sender; window.receiver = receiver;
  updateSender(sender.base, sender.nextSeq, sender.unacked);
  updateReceiver(receiver.expected, receiver.delivered);
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('startBtn').addEventListener('click', ()=>{
    setupFromUI(); log('Simulation: started');
    // send up to window
    while(sender.canSend()) sender.sendNext();
  });
  $('stepBtn').addEventListener('click', ()=>{
    if (!sender) { log('Call Start first'); return; }
    // single step: try send one packet if allowed
    if (!sender.sendNext()) log('Step: nothing to send now');
  });
  $('resetBtn').addEventListener('click', ()=>{ location.reload(); });
});

// Expose a simple global for channel callbacks
function senderOnAck(ackNum){ if (sender) sender.onAck(ackNum); }

// Bind target functions expected by Channel (sender/receiver will be set after setup)
// Channel uses sender.onAck and receiver.onData via bound references passed during setup
