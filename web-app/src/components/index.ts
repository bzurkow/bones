// Bones component library -- now lives entirely in the shared "shared-ui"
// package (component dev work defaults there, not here, so a second app
// never has to wait for a hoist). This file stays only as a re-export
// barrel so every existing `from "./components"` import in this app keeps
// working unchanged; add nothing new here -- new components go straight
// into shared-ui/src/components instead.
export * from "shared-ui";
