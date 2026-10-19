const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/hersheytext.js')
const jsText = await res.text()
console.log(jsText.slice(0, 1000))
