export type Message = {
    from: string;
    content: string;
    order: number;
};

export type MessageWithID = Message & { id: string };

// Tracks the current global version of the database. There is only one of
// these system-wide.
type ReplicacheSpace = {
    version: number;
};

type ReplicacheClientGroup = {
    // Same as Reset Strategy.
    id: string;
    userID: any;
};

type ReplicacheClient = {
    // Same as Reset Strategy.
    id: string;
    clientGroupID: string;
    lastMutationID: number;

    // The global version this client was last modified at.
    lastModifiedVersion: number;
};

// Each of your domain entities will have two extra fields.
type Todo = {
    // ... fields needed for your application (id, title, complete, etc)

    // The global version this entity was last modified at.
    lastModifiedVersion: number;

    // "Soft delete" for marking whether this entity has been deleted.
    deleted: boolean;
};
