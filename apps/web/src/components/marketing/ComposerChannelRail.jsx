import React, { useState, useRef, useEffect } from "react";
import { ChannelMark } from "../PublishingViews";
import { providers, variant } from "./constants";
import ComposerChannelDropdown from "./ComposerChannelDropdown";

export default function ComposerChannelRail({
  post,
  patch,
  active,
  setActive,
  channels = [],
  onConnectChannel,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const railRef = useRef(null);
  const selectedVariants = post.variants || [];
  const connectedChannels = channels.filter((c) => c.status === "connected");
  const selectedProviders = selectedVariants.map((v) => v.provider);

  useEffect(() => {
    function handleClickOutside(e) {
      if (railRef.current && !railRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const toggleChannel = (provider) => {
    const isSelected = selectedProviders.includes(provider);
    if (isSelected) {
      const nextVariants = selectedVariants.filter((v) => v.provider !== provider);
      patch({ variants: nextVariants });
      if (active === provider) {
        setActive(nextVariants[0]?.provider || "");
      }
    } else {
      const nextVariants = [...selectedVariants, variant(provider)];
      patch({ variants: nextVariants });
      if (!active) setActive(provider);
    }
  };

  const handleSelectAll = () => {
    const all = connectedChannels.map((c) => variant(c.provider));
    patch({ variants: all });
    if (!active && all[0]) setActive(all[0].provider);
  };

  const handleDeselectAll = () => {
    patch({ variants: [] });
    setActive("");
  };

  return (
    <div className="buffer-channel-rail" ref={railRef} aria-label="Chọn kênh đăng bài">
      <div className="channel-rail-list">
        {selectedVariants.map((v) => {
          const key = v.provider;
          const chan = connectedChannels.find((c) => c.provider === key);
          const label = chan?.name || providers[key] || key;
          const avatarUrl =
            chan?.avatar_url ||
            (typeof localStorage !== "undefined"
              ? localStorage.getItem("user_avatar")
              : null);
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              className={`channel-rail-avatar is-selected ${isActive ? "is-active" : ""}`}
              onClick={() => setActive(key)}
              title={`${label} (${isActive ? "Đang chọn" : "Bấm để chuyển"})`}
            >
              <div className="avatar-circle">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={label}
                    className="channel-rail-user-img"
                  />
                ) : (
                  <span className="avatar-initial">
                    {(label || key)[0].toUpperCase()}
                  </span>
                )}
                <div className="avatar-platform-badge">
                  <ChannelMark provider={key} size="mini" />
                </div>
              </div>
            </button>
          );
        })}

        <div className="channel-rail-action-wrap">
          <button
            type="button"
            className={`channel-rail-add-btn ${dropdownOpen ? "is-open" : ""}`}
            title="Chọn kênh đăng bài"
            aria-label="Chọn kênh"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span>+</span>
          </button>

          {dropdownOpen && (
            <ComposerChannelDropdown
              channels={channels}
              selectedProviders={selectedProviders}
              onToggleChannel={toggleChannel}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onConnectNewChannel={() => {
                setDropdownOpen(false);
                onConnectChannel?.();
              }}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
