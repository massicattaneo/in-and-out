import { HtmlView } from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function({ locale, system, thread }) {
    const view = HtmlView(template, style, locale.get());
    view.style();

    // Variables
    var viewer = view.get("viewer"), // Calculator screen where result is displayed
        equals = view.get("equals"), // Equal button
        nums = view.get(".num"), // List of numbers
        ops = view.get(".ops"), // List of operators
        theNum = "", // Current number
        oldNum = "", // First number
        resultNum, // Result
        operator; // Batman

    // When: Number is clicked. Get the current number selected
    view.get('wrapper').setNum = function(value) {
        if (resultNum) { // If a result was displayed, reset number
            theNum = value;
            resultNum = "";
        } else { // Otherwise, add digit to previous number (this is a string!)
            theNum += value;
        }
        viewer.innerHTML = theNum; // Display current number

    };

    // When: Operator is clicked. Pass number to oldNum and save operator
    view.get('wrapper').moveNum = function(value) {
        oldNum = theNum;
        theNum = "";
        operator = value;
        equals.setAttribute("data-result", ""); // Reset result in attr
    };

    // When: Equals is clicked. Calculate result
    var displayNum = function() {

        // Convert string input to numbers
        oldNum = parseFloat(oldNum);
        theNum = parseFloat(theNum);

        // Perform operation
        switch (operator) {
        case "+":
            resultNum = oldNum + theNum;
            break;

        case "-":
            resultNum = oldNum - theNum;
            break;

        case "*":
            resultNum = oldNum * theNum;
            break;

        case "/":
            resultNum = oldNum / theNum;
            break;

            // If equal is pressed without an operator, keep number and continue
        default:
            resultNum = theNum;
        }

        // If NaN or Infinity returned
        if (!isFinite(resultNum)) {
            if (isNaN(resultNum)) { // If result is not a number; set off by, eg, double-clicking operators
                resultNum = "You broke it!";
            } else { // If result is infinity, set off by dividing by zero
                resultNum = "Look at what you've done";
                view.get('calculator').classList.add("broken"); // Break calculator
                view.get('reset').classList.add("show"); // And show reset button
            }
        }

        // Display result, finally!
        viewer.innerHTML = resultNum;
        equals.setAttribute("data-result", resultNum);

        // Now reset oldNum & keep result
        oldNum = 0;
        theNum = resultNum;

    };

    // When: Clear button is pressed. Clear everything
    var clearAll = function() {
        oldNum = "";
        theNum = "";
        viewer.innerHTML = "0";
        equals.setAttribute("data-result", resultNum);
    };

    // Add click event to equal sign
    equals.onclick = displayNum;

    // Add click event to clear button
    view.get("clear").onclick = clearAll;


    view.destroy = function() {

    };

    window.addEventListener('keyup', function(ev) {
        if (location.pathname === locale.get('urls.calculator.href')) {
            ev.preventDefault();
            if (!isNaN(ev.key)) {
                view.get('wrapper').setNum(ev.key);
            } else if(ev.key === '.') {
                view.get('wrapper').setNum(ev.key);
            } else if(['+', '-', '*', '/'].indexOf(ev.key) !== -1) {
                view.get('wrapper').moveNum(ev.key);
            } else if(ev.key === 'Enter') {
                displayNum();
            } else if(ev.key === 'c' || ev.key === 'C') {
                clearAll();
            }
        }
    });

    return view;
}