var getYear = require('date-fns/get_year');
var getMonth = require('date-fns/get_month');
var getDay = require('date-fns/get_date');
var getLastDay = require('date-fns/last_day_of_month');
var format = require('date-fns/format');

module.exports = getDate

function getDate (date) {
  const dateChunks = date.split('-');

  var hasYear = !!dateChunks[0]
  var hasMonth = !!dateChunks[1]
  var hasDay = !!dateChunks[2]

  var year = getYear(date);
  var month = format(date, 'MM');
  var day = getDay(date);
  var lastDay = parseInt(format(getLastDay(date), 'DD'));

  var textYear = format(date, 'YYYY');
  var textMonth = format(date, 'MMMM');
  var textDay = format(date, 'Do');
  var textLastDay = format(getLastDay(date), 'Do');

  return {
    hasYear: hasYear,
    hasMonth: hasMonth,
    hasDay: hasDay,
    onlyYear: hasYear && !hasMonth && !hasDay,
    year: year,
    month: hasMonth ? null : month,
    day: hasDay ? null : day,
    lastDayOfMonth: hasMonth ? null : lastDay,
    text: {
      year: textYear,
      month: hasMonth ? null : textMonth,
      day: hasDay ? null : textDay,
      lastDayOfMonth: hasMonth ? null : textLastDay
    }
  };
}
