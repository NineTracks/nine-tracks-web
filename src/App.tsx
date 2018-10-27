import * as React from "react";
import { BrowserRouter, Route,  } from "react-router-dom";

import { LandingPage } from './pages/Landing/LandingPage';

import "./nt.css";

class App extends React.Component {
    public render() {
        return (
            <BrowserRouter>
                <Route path="/" exact={true} component={LandingPage} />
            </BrowserRouter>
        );
    }
}

export default App;
