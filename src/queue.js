/**
 * Sequential In-Memory Queue to prevent RAM spikes (especially crucial for Railway's limits)
 * Processes tasks strictly one by one.
 */
class AsyncQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    /**
     * Add a task to the queue and wait for its completion.
     * @param {Function} task - Async function to execute
     * @returns {Promise<any>}
     */
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            this.process();
        });
    }

    /**
     * Internal method to sequentially drain the queue.
     */
    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;
        
        const task = this.queue.shift();
        await task();
        
        this.processing = false;
        
        // Process next item immediately
        this.process();
    }
}

// Export a single instance to act as a global queue for the app
module.exports = new AsyncQueue();
