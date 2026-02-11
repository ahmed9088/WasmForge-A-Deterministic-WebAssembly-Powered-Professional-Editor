import { Action, EngineState } from './KineticTypes';

/**
 * Format for a serialized project.
 * Versioning allows us to migrate data safely in the future.
 */
export interface KineticProjectFile {
    version: number;
    metadata: {
        id: string;
        name: string;
        lastModified: number;
    };
    // We can persist either the snapshot or the OpLog.
    // Storing the OpLog allows for perfect undo/redo recovery after loading.
    opLog: Action[];
}

/**
 * Handles persistence of Kinetic Studio projects.
 * Supports localStorage with hooks for future cloud-sync capability.
 */
export class KineticStorageManager {
    private readonly CURRENT_VERSION = 1;

    /**
     * Serializes the project into a versioned JSON format.
     */
    public serialize(id: string, name: string, opLog: Action[]): string {
        const project: KineticProjectFile = {
            version: this.CURRENT_VERSION,
            metadata: {
                id,
                name,
                lastModified: Date.now(),
            },
            opLog,
        };
        return JSON.stringify(project);
    }

    /**
     * Saves a project to local storage.
     */
    public saveLocal(id: string, name: string, opLog: Action[]): void {
        try {
            const data = this.serialize(id, name, opLog);
            localStorage.setItem(`kinetic_project_${id}`, data);
            console.log(`[Storage] Project "${name}" saved successfully.`);
        } catch (error) {
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                throw new Error('Storage space exceeded. Consider deleting old projects or upgrading to Cloud Storage.');
            }
            throw error;
        }
    }

    /**
     * Loads a project and performs version migrations if necessary.
     */
    public loadLocal(id: string): KineticProjectFile {
        const raw = localStorage.getItem(`kinetic_project_${id}`);
        if (!raw) throw new Error(`Project ${id} not found.`);

        let project: KineticProjectFile;
        try {
            project = JSON.parse(raw);
        } catch (e) {
            throw new Error('Crrupted project file. Data could not be parsed.');
        }

        // Version Migration Logic
        if (project.version < this.CURRENT_VERSION) {
            this.migrate(project);
        }

        return project;
    }

    /**
     * Server hook placeholder.
     */
    public async saveRemote(project: KineticProjectFile): Promise<void> {
        console.log('[Storage] Preparation: Sending project to Cloud Relay...', project);
        // Future: fetch('/api/projects', { method: 'POST', body: JSON.stringify(project) })
    }

    private migrate(project: KineticProjectFile) {
        console.log(`[Storage] Migrating project from version ${project.version} to ${this.CURRENT_VERSION}`);
        // Example: Add default values or change schema structure
        project.version = this.CURRENT_VERSION;
    }
}
