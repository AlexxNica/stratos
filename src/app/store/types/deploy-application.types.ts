import { NewAppCFDetails } from './create-application.types';


export interface SourceType {
  name: string;
  id: string;
  subType?: string;
}

export interface ProjectBranches {
  fetching: boolean;
  success: boolean;
  data: any;
}

export interface GitBranch {
  name: string;
}
export interface DeployApplicationSource {
  type: SourceType;
  projectName?: string;
  branch?: GitBranch;
  branches?: ProjectBranches;
  commit?: any;
}

export interface GitAppDetails {
  projectName: string;
  branch: GitBranch;
}

export interface Commit {
  sha: string;
  url: string;
}


export interface DeployApplicationState {
  cloudFoundryDetails: NewAppCFDetails;
  applicationSource?: DeployApplicationSource;
  projectExists?: {
    checking: boolean,
    exists: boolean,
    name: string,
    data: any
  };
}

export const socketEventTypes = {
  DATA: 20000,
  MANIFEST: 20001,
  CLOSE_SUCCESS: 20002,
  CLOSE_PUSH_ERROR: 40000,
  CLOSE_NO_MANIFEST: 40001,
  CLOSE_INVALID_MANIFEST: 40002,
  CLOSE_FAILED_CLONE: 40003,
  CLOSE_FAILED_NO_BRANCH: 40004,
  CLOSE_FAILURE: 40005,
  CLOSE_NO_SESSION: 40006,
  CLOSE_NO_CNSI: 40007,
  CLOSE_NO_CNSI_USERTOKEN: 40008,
  EVENT_CLONED: 10000,
  EVENT_FETCHED_MANIFEST: 10001,
  EVENT_PUSH_STARTED: 10002,
  EVENT_PUSH_COMPLETED: 10003,
  SOURCE_REQUIRED: 30000,
  SOURCE_GITHUB: 30001,
  SOURCE_FOLDER: 30002,
  SOURCE_FILE: 30003,
  SOURCE_FILE_DATA: 30004,
  SOURCE_FILE_ACK: 30005,
  SOURCE_GITURL: 30006
};