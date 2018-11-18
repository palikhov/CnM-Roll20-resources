class RequestQueue {
	constructor (parallelism) {
		this.parallelism = parallelism;

		this.active = 0;
		this.queue = [];
	}

	/**
	 * @param task A function that returns a promise
	 */
	add (task) {
		if (this.active < this.parallelism) {
			this.active++;
			task().then(() => {
				this.active--;
				this._doRunNextTask();
			});
		} else {
			this.queue.push(task);
		}
	}

	_doRunNextTask () {
		if (this.queue.length) {
			this.active++;
			const task = this.queue.shift();
			task().then(() => {
				this.active--;
				this._doRunNextTask();
			});
		}
	}
}

module.exports = {
	RequestQueue
};
