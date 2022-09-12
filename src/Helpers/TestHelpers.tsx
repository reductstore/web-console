import {createMemoryHistory} from "history";
import {RouteComponentProps} from "react-router-dom";
import waitUntil from "async-wait-until";
import {ReactWrapper} from "enzyme";
import {act} from "react-dom/test-utils";

export const makeRouteProps = (): RouteComponentProps => {
    return {
        match: {
            isExact: false,
            path: "",
            url: "",
            params: {id: "1"}
        },
        // @ts-ignore
        location: {},
        // @ts-ignore
        history: createMemoryHistory()
    };
};

export const mockJSDOM = () => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(), // deprecated
            removeListener: jest.fn(), // deprecated
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
};

export const waitUntilFind = async (wrapper: ReactWrapper, predictor: any) => {
    let elements: any = [];
    await waitUntil(() => {
        act(() => {
            // @ts-ignore
            elements = wrapper.update().find(predictor);
        });
        return elements.length > 0;
    });

    return elements;
};
