import {mount} from "enzyme";
import {mockJSDOM, makeRouteProps} from "../../Helpers/TestHelpers";
import {Client, QuotaType} from "reduct-js";
import Login from "./Login";
import waitUntil from "async-wait-until";

mockJSDOM();

describe("Auth::Login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();

    });

    const client = new Client("");
    const backend = {
        get client() {
            return client;
        },
        login: jest.fn(),
        logout: jest.fn(),
        isAllowed: jest.fn(),
    };

    const props = {
        backendApi: backend,
        onLogin: jest.fn(),
        ...makeRouteProps()
    };

    const wrapper = mount(<Login {...props}/>);
    wrapper.find({name: "token"});
    const button = wrapper.find({type: "submit"}).at(0);


    it("should login and call onlogin", async () => {
        backend.login.mockResolvedValue({});
        button.simulate("submit");

        await waitUntil(() => backend.login.mock.calls.length > 0);
        expect(backend.login).toBeCalledWith(undefined); // Find a way test input field
        expect(props.onLogin).toBeCalled();
    });
});
