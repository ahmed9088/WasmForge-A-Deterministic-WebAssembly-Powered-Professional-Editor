import { Action, Point } from './KineticTypes';
import { KineticBridge } from './KineticBridge';

/**
 * Manages the real-time sync lifecycle for the client.
 * Connects to the Relay server and handles incoming actions from collaborators.
 */
export class KineticSyncManager {
    private ws: WebSocket | null = null;
    private onActionReceived: (action: Action) => void = () => { };
    private onPresenceReceived: (userId: string, pos: Point) => void = () => { };

    constructor(
        private relayUrl: string,
        private projectId: string,
        private userId: string
    ) { }

    /**
     * Connects to the collaboration relay and joins the project room.
     */
    public connect() {
        this.ws = new WebSocket(this.relayUrl);

        this.ws.onopen = () => {
            console.log('[Sync] Connected to Relay');
            this.send({
                type: 'JOIN_PROJECT',
                projectId: this.projectId,
                userId: this.userId
            });
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleIncoming(message);
        };

        this.ws.onclose = () => {
            console.warn('[Sync] Connection lost. Attempting reconnect...');
            setTimeout(() => this.connect(), 3000);
        };
    }

    /**
     * Broadcasts a local action to all collaborators.
     */
    public broadcastAction(action: Action) {
        this.send({
            type: 'SYNC_ACTION',
            projectId: this.projectId,
            userId: this.userId,
            payload: action
        });
    }

    /**
     * Broadcasts local cursor presence.
     */
    public broadcastPresence(pos: Point) {
        this.send({
            type: 'PRESENCE_UPDATE',
            projectId: this.projectId,
            userId: this.userId,
            pos
        });
    }

    private handleIncoming(message: any) {
        if (message.type === 'SYNC_ACTION') {
            this.onActionReceived(message.payload);
        } else if (message.type === 'PRESENCE_UPDATE') {
            this.onPresenceReceived(message.userId, message.pos);
        }
    }

    private send(message: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    public onAction(callback: (action: Action) => void) {
        this.onActionReceived = callback;
    }

    public onPresence(callback: (userId: string, pos: Point) => void) {
        this.onPresenceReceived = callback;
    }

    public disconnect() {
        this.ws?.close();
        this.ws = null;
    }
}
