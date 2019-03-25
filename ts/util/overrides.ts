import { EventEmitter } from 'events';

function overrideEventListener<T extends EventEmitter>(item: T) {
	const oldEmitter = item.emit;

	item.emit = function() {
		var emitArgs = arguments;

		console.log('Event: ' + emitArgs[0]);

		return oldEmitter.apply(item, <any>emitArgs);
	}
}




export = {
	overrideEventListener
};