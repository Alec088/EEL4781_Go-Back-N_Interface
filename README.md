# Go-Back-N Protocol Simulator

This is a browser-based simulator of the Go-Back-N reliable data transfer protocol. It is implemented as a single self-contained HTML file and can be opened directly in a browser or hosted on GitHub Pages.

## What’s included

- A simple interactive UI for configuring the simulator
- A sender window with color-coded packet states
- A channel view for in-flight data and ACKs
- A receiver view for accepted and discarded packets
- An event log that records sender, receiver, and channel activity
- Completion logging that reports the number of steps and elapsed time

## Files

- `index.html` — complete UI, styling, and simulator logic in one file

## How to run

1. Open `index.html` in a browser.
2. Set the window size `N`, sequence space `K`, number of packets, propagation delay, and any manual data/ACK drops.
3. Click `Start` to run the simulation, or `Step` to advance one send action at a time.
4. Use `Reset` to reload the page and begin again.

## Notes on implementation

- The sender uses a retransmission timer and retries unacknowledged packets within a bounded timeout limit.
- The receiver accepts in-order packets, re-acks duplicates, and discards out-of-order data.
- The channel simulates propagation delay and allows manual drops for both data packets and ACKs.

## Possible future enhancements

- Add animated packet movement through the channel
- Add random loss probability controls
- Add a visual timeline of ACK and retransmission events
