const queue = require('./queue');

describe('AsyncQueue', () => {
    beforeEach(() => {
        // Reset queue state before each test
        queue.queue = [];
        queue.processing = false;
    });

    test('should return immediately when processing an empty collection', async () => {
        // Queue is empty (queue.length === 0) and not processing
        expect(queue.queue.length).toBe(0);
        expect(queue.processing).toBe(false);

        await queue.process();

        // State should remain unchanged
        expect(queue.queue.length).toBe(0);
        expect(queue.processing).toBe(false);
    });

    test('should return immediately when already processing', async () => {
        // Add a mock task to the queue
        queue.queue.push(async () => {
            return new Promise(resolve => setTimeout(resolve, 50));
        });

        // Manually set processing to true
        queue.processing = true;

        await queue.process();

        // State should remain unchanged, process should return early without executing the task
        expect(queue.queue.length).toBe(1);
        expect(queue.processing).toBe(true);
    });

    test('should process a basic task and drain the queue sequentially', async () => {
        const results = [];

        // Add a few simple tasks
        const task1 = queue.add(async () => {
            results.push(1);
            return 'Task 1 done';
        });

        const task2 = queue.add(async () => {
            results.push(2);
            return 'Task 2 done';
        });

        const resolved = await Promise.all([task1, task2]);

        // Expect results to be in sequence
        expect(results).toEqual([1, 2]);
        expect(resolved).toEqual(['Task 1 done', 'Task 2 done']);

        // Queue should be empty and not processing anymore
        expect(queue.queue.length).toBe(0);
        expect(queue.processing).toBe(false);
    });
});
