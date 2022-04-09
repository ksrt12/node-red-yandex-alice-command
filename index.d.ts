//

type RedNode = import("node-red").Node;
type RED = import("node-red").NodeAPI;
type NodeConfig = import("node-red").NodeDef;
type NodeStatusFill = import("node-red").NodeStatusFill;
type NodeStatusShape = import("node-red").NodeStatusShape;

type Headers_ = import("node-fetch").Headers;
type Response_ = import("node-fetch").Response;
interface Response extends Response_ { }

type NodeContextData = import("node-red").NodeContextData;

type FuncLog = (msg_text: string) => void;
type FuncSetStatus = (color: NodeStatusFill, shape: NodeStatusShape, topic: string, status: string) => void;
type FuncSetError = (topic: string, status: string) => void;
type FuncClean = () => NodeClean;