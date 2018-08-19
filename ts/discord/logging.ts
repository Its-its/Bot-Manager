import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
	return `[${info.timestamp}]: ${info.level.toUpperCase()}: ${info.message}`;
});

const logger = createLogger({
    format: combine(
        // label({ label: 'right meow!' }),
        format((info, opts) => {
            if (!info.timestamp) {
                info.timestamp = new Date().toLocaleString();
            }

            if (opts.alias) {
                info[opts.alias] = info.timestamp;
            }

            return info;
        })(),
        myFormat
    ),
    transports: [
        new transports.Console(<any>{
            timestamp: () => new Date().toDateString()
        })
    ]
});

export = logger