import { useEffect, useMemo, useState } from "react";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Scoreboard from "./pages/Scoreboard";
import PlayerDetail from "./pages/PlayerDetail";
import Categories from "./pages/Categories";
import Rules from "./pages/Rules";
import BuilderHome from "./pages/BuilderHome";
import TemplateBuilder from "./pages/TemplateBuilder";
import TemplateSelector from "./pages/TemplateSelector";
import Onboarding, { OnboardingStep } from "./components/Onboarding";
import HelpPanel from "./components/HelpPanel";
import { createId } from "./lib/id";
import { AppProvider, useAppDispatch, useAppState } from "./state/store";
import { AppState } from "./state/types";

const AppContent = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [view, setView] = useState<
    | { name: "home" }
    | { name: "setup"; templateId?: string }
    | { name: "template-selector" }
    | { name: "scoreboard"; sessionId: string }
    | { name: "player"; sessionId: string; playerId: string }
    | { name: "categories"; sessionId: string }
    | { name: "rules"; sessionId: string }
    | { name: "builder" }
    | { name: "template-builder"; templateId?: string }
  >({ name: "home" });
  const [showHelp, setShowHelp] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const activeSessionId = useMemo(() => {
    if (view.name === "scoreboard" || view.name === "player" || view.name === "categories" || view.name === "rules") {
      return view.sessionId;
    }
    return state.activeSessionId;
  }, [state.activeSessionId, view]);

  const session = activeSessionId ? state.sessions[activeSessionId] : undefined;


  const handleImportState = (next: AppState) => {
    dispatch({ type: "state/replace", payload: next });
    setView({ name: "home" });
  };

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "welcome",
      target: "h1",
      title: "Welcome to Universal Score Keeper!",
      content: "Track scores for any board game—no turn management or rules enforcement. Let's take a quick tour to get you started.",
      position: "bottom",
    },
    {
      id: "new-session",
      target: '[data-onboarding="new-session"]',
      title: "Create Your First Session",
      content: "Click 'New Session' to start tracking scores. You can create multiple sessions for different games.",
      position: "bottom",
    },
    {
      id: "sessions-list",
      target: '[data-onboarding="sessions"]',
      title: "Your Sessions",
      content: "All your game sessions appear here. Click any session to continue scoring.",
      position: "bottom",
    },
  ];

  const showOnboarding =
    !state.onboarding?.completed && state.onboarding?.currentStep !== undefined;

  useEffect(() => {
    // Check if onboarding should start (only on initial load, not when navigating)
    if (
      !state.onboarding?.completed &&
      state.onboarding?.currentStep === undefined &&
      Object.keys(state.sessions).length === 0 &&
      view.name === "home"
    ) {
      dispatch({ type: "onboarding/set-step", payload: 0 });
    }
  }, [state.onboarding, state.sessions, dispatch, view.name]);

  const handleOnboardingNext = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      const nextStep = onboardingStep + 1;
      setOnboardingStep(nextStep);
      dispatch({ type: "onboarding/set-step", payload: nextStep });
    }
  };

  const handleOnboardingPrevious = () => {
    if (onboardingStep > 0) {
      const prevStep = onboardingStep - 1;
      setOnboardingStep(prevStep);
      dispatch({ type: "onboarding/set-step", payload: prevStep });
    }
  };

  const handleOnboardingSkip = () => {
    dispatch({ type: "onboarding/complete" });
    setOnboardingStep(0);
  };

  const handleOnboardingComplete = () => {
    dispatch({ type: "onboarding/complete" });
    setOnboardingStep(0);
  };

  useEffect(() => {
    if (state.onboarding?.currentStep !== undefined) {
      setOnboardingStep(state.onboarding.currentStep);
    }
  }, [state.onboarding?.currentStep]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") {
        if (view.name !== "home") {
          setView({ name: "home" });
        }
      } else if (e.key === "n" || e.key === "N") {
        if (view.name === "home") {
          setView({ name: "setup" });
        }
      } else if (e.key === "?" && !showHelp) {
        setShowHelp(true);
      } else if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [view, showHelp]);

  if (view.name === "template-selector") {
    return (
      <TemplateSelector
        state={state}
        onSelectTemplate={(templateId) => {
          // Navigate to setup with template
          setView({ name: "setup", templateId });
        }}
        onStartFromScratch={() => setView({ name: "setup" })}
        onCancel={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "setup") {
    const templateId = "templateId" in view ? view.templateId : undefined;
    return (
      <Setup
        dispatch={dispatch}
        templateId={templateId}
        state={state}
        onBack={() => setView({ name: "home" })}
        onSelectTemplate={() => setView({ name: "template-selector" })}
        onCreate={(sessionId) => setView({ name: "scoreboard", sessionId })}
      />
    );
  }

  if (view.name === "player" && session) {
    return (
      <PlayerDetail
        state={state}
        session={session}
        playerId={view.playerId}
        dispatch={dispatch}
        onBack={() => setView({ name: "scoreboard", sessionId: session.id })}
      />
    );
  }

  if (view.name === "categories" && session) {
    return (
      <Categories
        state={state}
        session={session}
        dispatch={dispatch}
        onBack={() => setView({ name: "scoreboard", sessionId: session.id })}
      />
    );
  }

  if (view.name === "rules" && session) {
    return (
      <Rules
        state={state}
        session={session}
        dispatch={dispatch}
        onBack={() => setView({ name: "scoreboard", sessionId: session.id })}
      />
    );
  }

  if (view.name === "scoreboard" && session) {
    return (
      <Scoreboard
        state={state}
        session={session}
        dispatch={dispatch}
        onHome={() => setView({ name: "home" })}
        onOpenPlayer={(playerId) =>
          setView({ name: "player", sessionId: session.id, playerId })
        }
        onManageCategories={() => setView({ name: "categories", sessionId: session.id })}
        onManageRules={() => setView({ name: "rules", sessionId: session.id })}
      />
    );
  }

  if (view.name === "builder") {
    return (
      <BuilderHome
        state={state}
        onNewTemplate={() => setView({ name: "template-builder" })}
        onEditTemplate={(templateId) => setView({ name: "template-builder", templateId })}
        onDeleteTemplate={(templateId) => {
          dispatch({ type: "template/remove", payload: { templateId } });
        }}
        onDuplicateTemplate={(templateId) => {
          const template = state.templates[templateId];
          if (template) {
            const newId = createId();
            dispatch({
              type: "template/duplicate",
              payload: { templateId, newId, newName: `${template.name} (Copy)` },
            });
            // Navigate to edit the duplicated template
            setTimeout(() => {
              setView({ name: "template-builder", templateId: newId });
            }, 100);
          }
        }}
        onBack={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "template-builder") {
    return (
      <TemplateBuilder
        state={state}
        templateId={view.templateId}
        dispatch={dispatch}
        onSave={() => setView({ name: "builder" })}
        onCancel={() => setView({ name: "builder" })}
      />
    );
  }

  return (
    <>
      <Home
        state={state}
        onNewSession={() => setView({ name: "template-selector" })}
        onOpenSession={(sessionId) => setView({ name: "scoreboard", sessionId })}
        onImportState={handleImportState}
        onShowHelp={() => setShowHelp(true)}
        onOpenBuilder={() => setView({ name: "builder" })}
        onDeleteSession={(sessionId) => {
          dispatch({ type: "session/remove", payload: { sessionId } });
          // Navigate to home if we're viewing the deleted session
          if (view.name === "scoreboard" && view.sessionId === sessionId) {
            setView({ name: "home" });
          } else if (view.name === "player" && view.sessionId === sessionId) {
            setView({ name: "home" });
          } else if (view.name === "categories" && view.sessionId === sessionId) {
            setView({ name: "home" });
          } else if (view.name === "rules" && view.sessionId === sessionId) {
            setView({ name: "home" });
          }
        }}
      />
      {showOnboarding && (
        <Onboarding
          steps={onboardingSteps}
          currentStep={onboardingStep}
          onNext={handleOnboardingNext}
          onPrevious={handleOnboardingPrevious}
          onSkip={handleOnboardingSkip}
          onComplete={handleOnboardingComplete}
        />
      )}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
    </>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;

