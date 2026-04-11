export function ConnectionStatus({ status }) {
    const getStatusColor = () => {
        switch (status) {
            case 'CONNECTED': return 'bg-green-500';
            case 'QR_READY': return 'bg-yellow-400';
            case 'AUTHENTICATED': return 'bg-blue-400';
            case 'DISCONNECTED': return 'bg-red-400';
            default: return 'bg-slate-300';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'CONNECTED': return 'Live! ✅';
            case 'QR_READY': return 'Ready! 📱';
            case 'AUTHENTICATED': return 'In! 🔓';
            case 'DISCONNECTED': return 'Off ❌';
            default: return status || 'Loading...';
        }
    };

    return (
        <div className="flex items-center gap-3 px-6 py-2 bg-white doodle-border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} border border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`} />
            <span className="text-sm font-black text-slate-900 whitespace-nowrap">{getStatusText()}</span>
        </div>
    );
}
