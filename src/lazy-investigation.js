// Investigation, capstone and practice routes: equipment, workspaces, requester conversation and experiments.
export {applyHardwareAction,verifyHardware,renderHardware,disposeHardware,cancelHardwareInteraction,setHardwareVisible} from './hardware.js?release=20261106-fast-start';
export {applyWorkspaceAction,verifyWorkspace,renderWorkspace,disposeWorkspace} from './workspaces.js?release=20261106-fast-start';
export {cancelCodingWorkbench} from './coding-workbench.js?release=20261106-fast-start';
export {answerQuestion,questionEvent,readQuestionEvents,inquiryProgress,retainInquiryEvents} from './interview.js?release=20261106-fast-start';
export {labLanguage} from './lab-language.js?release=20261106-fast-start';
export {requesterPersona} from './requester-persona.js?release=20261106-fast-start';
export {mountRequesterChat,resetRequesterPreference} from './requester-chat.js?release=20261106-fast-start';
export {mountLabLearning} from './learning-tools.js?release=20261106-fast-start';
export {retainExperimentEvents,experimentEventText,experimentReport,readExperiments} from './experiments.js?release=20261106-fast-start';
export {renderCapstone,mountCapstone,capstoneReport,capstoneProgress,capstoneHandoff} from './capstone.js?release=20261106-fast-start';
export {practiceScenarioFor,practiceHasWork,renderPracticeWorkbench,mountPracticeWorkbench} from './practice-workbench.js?release=20261106-fast-start';
export {normalizeLabRecord,workbenchProgress} from './records.js?release=20261106-fast-start';
export {attachClassroomLab} from './classroom-client.js?release=20261106-fast-start';
