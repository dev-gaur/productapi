var str = '/api/product/hawaii20/golgolgol1234/54642fwdg';

var str2 = '/api/product/hawai120';

var regex = new RegExp('^/api/product/[A-Za-z]{2,6}[0-9]{2,4}/?$')
var productcoderegex = new RegExp('[A-Za-z]{2,6}[0-9]{2,4}');
var regex2 = new RegExp('^[a-z]+[0-9]+\/?$')

console.log(regex);
console.log(regex.source);
console.log(regex.test(str));
console.log(regex.exec(str));
console.log(str.match(regex));

console.log("------------------------");
console.log(regex);
console.log(regex.source);
console.log(regex.test(str));
console.log(regex.test(str2));
console.log(regex.exec(str2));
console.log(str2.match(regex));
console.log("------------------------");
var codeexp = productcoderegex.exec(str2);

console.log(codeexp);
console.log(codeexp[0]);
console.log(codeexp.index);
console.log(codeexp[0].length);

console.log("------------------------");
console.log(regex2);
console.log(regex2.source);
console.log(regex2.test(str));
console.log(regex2.exec(str));
console.log(str2.match(regex2));