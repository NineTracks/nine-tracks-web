import * as React from "react";
import * as ReactDOM from "react-dom";

import App from "./App";
import registerServiceWorker from "./registerServiceWorker";

import "font-awesome/css/font-awesome.min.css";
import "./bootstrap.css";

ReactDOM.render(<App />, document.getElementById("root") as HTMLElement);
registerServiceWorker();
