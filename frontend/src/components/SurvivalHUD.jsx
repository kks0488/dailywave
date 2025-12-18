const SurvivalHUD = () => {
    const { metrics } = useWarRoomStore();

    return (
        <div className="hud-container">
            {/* Metric 1: Urgent CS/Delivery */}
            <div className="metric-card">
                <div className="icon-wrapper icon-red">
                    <Truck size={18} strokeWidth={2.5} />
                </div>
                <div className="metric-content">
                    <div className="metric-label">Urgent Action</div>
                    <div className="metric-value">
                        {metrics.urgentCS} <span className="metric-unit">건</span>
                    </div>
                </div>
            </div>

            {/* Metric 2: Cash Flow */}
            <div className="metric-card">
                <div className="icon-wrapper icon-gray">
                    <DollarSign size={18} strokeWidth={2.5} />
                </div>
                <div className="metric-content">
                    <div className="metric-label">Cash Flow</div>
                    <div className="metric-value">₩{metrics.cashFlow}</div>
                </div>
            </div>

            {/* Metric 3: Critical Issues */}
            <div className="metric-card">
                <div className="icon-wrapper icon-orange">
                    <AlertCircle size={18} strokeWidth={2.5} />
                </div>
                <div className="metric-content">
                    <div className="metric-label">Critical Issue</div>
                    <div className="metric-value-sm">{metrics.issues}</div>
                </div>
            </div>
        </div>
    );
};

export default SurvivalHUD;
