# Go-Back-N Protocol Simulator (JavaScript)

This is a browser-based simulator of the Go-Back-N reliable data transfer protocol. It is implemented in plain HTML/CSS/JavaScript and can be hosted via GitHub Pages.

Files created:

- `index.html` — main UI.
- `style.css` — basic styles.
- `app.js` — simulator logic (sender, receiver, channel).

How to run

1. Open `index.html` in a browser (or push to GitHub and enable Pages).
2. Configure the window size `N`, sequence space `K`, number of packets, propagation delay, and any manual drops.
3. Click `Start` to run the simulation. Use `Step` to send a single packet when allowed.

Notes on implementation

- Sender uses a single retransmission timer for the oldest unacknowledged packet.
- Receiver accepts only in-order packets and sends cumulative ACKs.
- Channel simulates fixed propagation delay and allows manual drops for data and ACKs.

Next improvements (optional):

- Add packet corruption checks (checksum) and visualization of retransmission timings.
- Add graphical animation of packets moving across the channel.
- Add controls to schedule timed losses or random loss probabilities.
