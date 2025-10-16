// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

import { configure } from "enzyme";
import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
configure({ adapter: new Adapter() });

jest.mock("react-chartjs-2", () => {
  return {
    Bar: () => null,
  };
});

// Add BigInt serialization support for Jest
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
