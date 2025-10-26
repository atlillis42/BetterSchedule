// Load order matters: vendor themes in the middle, overrides last.
import "./calendar-ui.css";        // app UI/layout (scoped)

import "./weekview.css";           // DayPilot themes
import "./monthview.css";
import "./navigator.css";

import "./react-select-overrides.css"; //React-Select input box styling
import "./event-modal.dark-fallback.css" //Fallback option for modals
import "./calendar-overrides.css"; // Overrides must be last

export { }; 