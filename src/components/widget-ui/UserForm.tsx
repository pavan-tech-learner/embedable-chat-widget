import { ChatConfig, UserInfo } from "@/types/chat-config";
import { useState } from "react";
import '../../styles/widget.css';

const UserInfoForm = ({ config, onSubmit }: {
    config: ChatConfig;
    onSubmit: (userInfo: UserInfo) => void;
}) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="cwb-user-form space-y-4">
            <div
                className="cwb-welcome-bubble bg-white p-3 rounded-lg shadow-sm text-sm flex items-center gap-2"
                style={{ borderLeft: `3px solid ${config.themeColor}` }}
            >
                <span className="text-xl">👋</span>
                <span style={{ color: config.themeColor }} className="font-medium">
                    Welcome!
                </span>
            </div>
            <div className="cwb-form-message text-sm text-gray-600 mb-4">
                {config.userInfoMessage}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {config.requiredFields.name && (
                    <div className="cwb-form-field">
                        <label className="cwb-field-label text-xs text-gray-600 mb-1 block">
                            Name *
                        </label>
                        <input
                            type="text"
                            placeholder="Your name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="cwb-form-input w-full px-3 py-2 border border-gray-200 rounded-md text-sm 
               focus:ring-3 cus:ring-opacity-10 focus:outline-none"
                            style={{
                                '--tw-ring-color': config.themeColor
                            } as React.CSSProperties}
                        />
                    </div>
                )}

                {config.requiredFields.email && (
                    <div className="cwb-form-field">
                        <label className="cwb-field-label text-xs text-gray-600 mb-1 block">
                            Email *
                        </label>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            className="cwb-form-input w-full px-3 py-2 border border-gray-200 rounded-md text-sm 
               focus:ring-3 cus:ring-opacity-10 focus:outline-none"
                            style={{
                                '--tw-ring-color': config.themeColor
                            } as React.CSSProperties}
                        />
                    </div>
                )}

                {config.requiredFields.phone && (
                    <div className="cwb-form-field">
                        <label className="cwb-field-label text-xs text-gray-600 mb-1 block">
                            Phone *
                        </label>
                        <input
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            required
                            className="cwb-form-input w-full px-3 py-2 border border-gray-200 rounded-md text-sm 
               focus:ring-3 cus:ring-opacity-10 focus:outline-none"
                            style={{
                                '--tw-ring-color': config.themeColor
                            } as React.CSSProperties}
                        />
                    </div>
                )}

                <button
                    type="submit"
                    className="cwb-start-chat-btn w-full py-2 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: config.themeColor }}
                >
                    Start Chat
                </button>
            </form>
        </div>
    );
};

export default UserInfoForm;