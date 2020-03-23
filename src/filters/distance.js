export default function (num) {
  const n = Number(num)
  let distance = null
  if (isNaN(n)) {
    distance = ' '
  } else {
    distance = n >= 1 ? n.toFixed(1) + 'km' : (n * 1000 >> 0) + 'm'
  }
  return distance
}
