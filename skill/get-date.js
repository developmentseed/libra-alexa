var getYear = require('date-fns/get_year');
var getMonth = require('date-fns/get_month');
var getDay = require('date-fns/get_date');
var getLastDay = require('date-fns/last_day_of_month');
var format = require('date-fns/format');

module.exports = getDate

function getDate (date) {
  const dateChunks = date.split('-');
  var year = getYear(date);
  var month = format(date, 'MM');
  var day = getDay(date);
  var lastDay = parseInt(format(getLastDay(date), 'DD'));

  var textYear = format(date, 'YYYY');
  var textMonth = format(date, 'MMMM');
  var textDay = format(date, 'Do');
  var textLastDay = format(getLastDay(date), 'Do');

  var hasYear = !!dateChunks[0]
  var hasMonth = !!dateChunks[1]
  var hasDay = !!dateChunks[2]

  return {
    hasYear: hasYear,
    hasMonth: hasMonth,
    hasDay: hasDay,
    onlyYear: hasYear && !hasMonth && !hasDay,
    year: year,
    month: month === 0 ? null : month,
    day: month === 0 ? null : day,
    lastDayOfMonth: month === 0 ? null : lastDay,
    text: {
      year: textYear,
      month: month === 0 ? null : textMonth,
      day: month === 0 ? null : textDay,
      lastDayOfMonth: month === 0 ? null : textLastDay
    }
  };
}
