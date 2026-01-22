const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DEFAULT_LOCALE = "es-AR";
const SQLITE_TIMEZONE_OFFSET = "-3 hours";

function getDateTimeParts(date = new Date(), options = {}) {
  const { timeZone = DEFAULT_TIME_ZONE, year = "2-digit" } = options;
  const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone,
    year,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

function formatDateTime(date = new Date(), options = {}) {
  const {
    timeZone = DEFAULT_TIME_ZONE,
    year = "2-digit",
    dateOrder = "DMY",
    dateSeparator = "-",
    timeSeparator = ":"
  } = options;

  const parts = getDateTimeParts(date, { timeZone, year });
  const dateStr =
    dateOrder === "YMD"
      ? `${parts.year}${dateSeparator}${parts.month}${dateSeparator}${parts.day}`
      : `${parts.day}${dateSeparator}${parts.month}${dateSeparator}${parts.year}`;
  const time = `${parts.hour}${timeSeparator}${parts.minute}${timeSeparator}${parts.second}`;

  return { date: dateStr, time, dateTime: `${dateStr} ${time}` };
}

module.exports = {
  DEFAULT_TIME_ZONE,
  SQLITE_TIMEZONE_OFFSET,
  getDateTimeParts,
  formatDateTime
};
