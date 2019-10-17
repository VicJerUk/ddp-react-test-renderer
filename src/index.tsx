import {cleanup as RTLcleanup, render as RTLrender, RenderResult} from '@testing-library/react';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

export const cleanup = () => RTLcleanup();

export class TestRenderer {
    private state: object | undefined;
    private mockStore: any;
    private readonly component: component;
    private readonly defaultProps: object;
    private readonly defaultState: object;
    private readonly middleware: any = [];
    private wrappers: IWrapper[] = [];
    private temporaryWrappers: IWrapper[] = [];
    private useTemporaryWrappers: boolean = false;

    constructor(component: any, defaultProps?: object, defaultState?: object) {
        this.component = component;
        this.defaultProps = defaultProps ? defaultProps : {};
        this.defaultState = defaultState ? defaultState : {};
        if (defaultState) {
            this.state = defaultState;
        }
        this.mockStore = configureStore(this.middleware);
    }

    render(props?: object, children?: component): TestRendererResult {

        const usingTemporaryWrappers = this.useTemporaryWrappers;
        const renderResult = RTLrender(this.buildComponent(props, children));

        return { 
            ...renderResult,
            rerender: (newProps: object) => {
                this.useTemporaryWrappers = usingTemporaryWrappers;
                renderResult.rerender(this.buildComponent(newProps, children))
            }
        }
    }

    renderWithStore(props?: object, state?: object, children?: component): TestRendererResultWithStore {
        this.setState(state);
        const store = this.setStore();
        const usingTemporaryWrappers = this.useTemporaryWrappers;

        const wrappedComponent = this.wrapWithProvider(store, this.buildComponent(props, children));

        const renderResult = RTLrender(wrappedComponent);

        return {
            ...renderResult,
            store,
            rerender: (newProps: object) => {
                this.useTemporaryWrappers = usingTemporaryWrappers;
                return renderResult.rerender(this.wrapWithProvider(store, this.buildComponent(newProps, children)))
            }
        };
    }

    updateStateWithDispatch(state: object): void {
        this.setState(state);
        this.mockStore.dispatch({ type: 'TESTING_UPDATE_ACTION' });
    }

    addWrapper = (component: component, props: object): number => {
        this.wrappers.push({ component, props });
        return this.wrappers.length - 1;
    };

    addTemporaryWrapper = (component: component, props: object): TestRenderer => {
        if (!this.useTemporaryWrappers) {
            this.temporaryWrappers = [...this.wrappers];
            this.useTemporaryWrappers = true;
        }

        this.temporaryWrappers.push({ component, props });
        return this;
    };

    useWrapperProps = (index: number, props: object): TestRenderer => {
        if (!this.useTemporaryWrappers) {
            this.temporaryWrappers = [...this.wrappers];
            this.useTemporaryWrappers = true;
        }

        this.modifyWrapperPropsArray(this.temporaryWrappers, index, props);

        return this;
    };

    getAllActions = (): action[] => this.mockStore.getActions();

    getActionsOfType = (actionType: string): action[] =>
        this.mockStore.getActions().filter((action: any) => action.type === actionType);

    getCountForAllActions = (): number => this.mockStore.getActions().length;

    getCountForAction = (actionType: string): number =>
        this.mockStore.getActions().filter((action: any) => action.type === actionType).length;

    private buildComponent = (props?: object, children?: component) => {
        const component = this.createBaseComponent(props, children);

        if (this.useTemporaryWrappers) {
            this.useTemporaryWrappers = false;
            return this.wrapWithTemporaryWrappers(component);
        } else {
            return this.wrapWithWrappers(component);
        }
    };

    private modifyWrapperPropsArray = (array: IWrapper[], index: number, props: object) => {
        array[index] = { component: this.wrappers[index].component, props };
    };

    private wrapWithWrappers = (component: component) => this.wrapWithWrapperArray(this.wrappers, component);

    private wrapWithTemporaryWrappers = (component: component) => this.wrapWithWrapperArray(this.temporaryWrappers, component);

    private wrapWithWrapperArray = (array: IWrapper[], component: component) => {
        array.forEach(wrapper => {
            component = this.wrapWithWrapper(component, wrapper);
        });
        return component;
    };

    private wrapWithWrapper = (component: component, wrapper: IWrapper) =>
        React.createElement(wrapper.component, { ...wrapper.props, children: component });

    private wrapWithProvider = (store: any, childComponent: component) => (
        <Provider store={store}>{childComponent}</Provider>
    );

    private createBaseComponent = (props?: object, children?: component) =>
        React.createElement(this.component, props ? props : this.defaultProps, children);

    private setStore = () => (this.mockStore = configureStore(this.middleware)(() => this.state));

    private setState = (state?: object): object => (this.state = state !== undefined ? state : this.defaultState);
}

interface IWrapper {
    component: component;
    props: object;
}

type Override<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type TestRendererResult = Override<RenderResult, { rerender: (newProps: object) => void }>
type TestRendererResultWithStore = Override<TestRendererResult, { store: object}>
type action = {type: string}
type component = any;

