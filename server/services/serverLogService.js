const { appendServerLog } = require('./clientLogService');

function initServerLogger() {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function (...args) {
    origLog.apply(console, args);
    appendServerLog('LOG', args.map(String).join(' '));
  };

  console.warn = function (...args) {
    origWarn.apply(console, args);
    appendServerLog('WARN', args.map(String).join(' '));
  };

  console.error = function (...args) {
    origError.apply(console, args);
    appendServerLog('ERROR', args.map(String).join(' '));
  };
}

initServerLogger();
