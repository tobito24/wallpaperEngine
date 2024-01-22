// Variablen
let string = "String";
let number = 1;
let number0 = 1.0;
let isValue = false;
let nothing = undefined;
let zero = null;

//Konstanten
const NUMBER_01 = 1;

//Objects
let person = {
    name: "Tobias",
    age : 24
}

//update
person.name = "Housten";
person["age"] = 25;

let selection = "age";
person[selection] = 24;

//Arrays (typeof -> object)
let colors = ["red", "blue"];
colors[2] = "green";
colors[3] = 420;

//functions
export function myFirstFunction(name = "Benutzer"){
    console.log("Moin "+ name);
}

myFirstFunction("Justus");
myFirstFunction();

//class
class TestKlasse{
    constructor(name, age){
        this.name = name;
        this.age = age;
    }
}

export default TestKlasse;