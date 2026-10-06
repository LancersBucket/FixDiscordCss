/**
 * @name FixDiscordCss
 * @author LancersBucket
 * @description Fix annoying stuff in your Discord client.
 * @version 0.0.1
 * @authorId 355477882082033664
 * @website https://github.com/LancersBucket/FixDiscordCss
 * @source https://raw.githubusercontent.com/LancersBucket/FixDiscordCss/refs/heads/main/FixDiscordCss.plugin.js
 */

/* 
    Original Copyright: Copyright (c) 2026 Vendicated and contributors
    https://github.com/Vendicated/Vencord/blob/main/src/plugins/_core/fixDiscordCss.ts
*/

const config = {
    info: {
        github: 'https://github.com/LancersBucket/FixDiscordCss',
        changelog_url: 'https://raw.githubusercontent.com/LancersBucket/FixDiscordCss/refs/heads/main/CHANGELOG.md',
        version: '0.0.1',
    },
};

module.exports = class FixDiscordCss {
    constructor(meta) {
        this.api = new BdApi(meta.name);
        this.version = this.api.Data.load('version') || '0.0.0';

        this.changelog();
        this.updateVersion();
    }

    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);

        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            if (aParts[i] > bParts[i]) return 1;
            if (aParts[i] < bParts[i]) return -1;
        }

        if (aParts.length !== bParts.length) {
            if (aParts.length > bParts.length) return 1;
            if (aParts.length < bParts.length) return -1;
        }

        return 0;
    }

    async changelog(ignoreVersionCheck = false) {
        // Ignore changelog for new install
        if (this.version === '0.0.0') return;

        const formatChangelog = (text) => {
            if (!text || typeof text !== 'string') return [];

            const latestSection = text
                .replace(/^#\s*Changelog\s*$/im, '')
                .split(/\n(?=##\s+)/)
                .map((section) => section.trim())
                .filter(Boolean)[0];

            if (!latestSection) return [];

            const typeMap = {
                // Purposely mapped wrong. I like how it looks this way.
                added: { title: 'Added', type: 'added' },
                changed: { title: 'Changed', type: 'progress' },
                fixed: { title: 'Fixed', type: 'improved' },
                removed: { title: 'Removed', type: 'fixed' },
            };

            const changes = [];
            let currentType = null;
            for (const rawLine of latestSection.split('\n')) {
                const line = rawLine.trim();
                if (!line) continue;

                const typeMatch = line.match(/^###\s+(Added|Fixed|Changed|Removed)\s*$/i);
                if (typeMatch) {
                    const normalizedType = typeMatch[1].toLowerCase();
                    currentType = typeMap[normalizedType] ? normalizedType : null;
                    continue;
                }

                if (!currentType) continue;

                const itemMatch = line.match(/^[-*]\s+(.*)$/);
                if (!itemMatch) continue;

                const existing = changes.find((entry) => entry.type === typeMap[currentType].type);
                if (existing) {
                    existing.items.push(itemMatch[1].trim());
                } else {
                    changes.push({
                        title: typeMap[currentType].title,
                        type: typeMap[currentType].type,
                        items: [itemMatch[1].trim()],
                    });
                }
            }

            return changes;
        }

        if (ignoreVersionCheck || this.compareVersions(this.version, config.info.version) < 0) {
            let changelog = ''
            try {
                let response = await fetch(config.info.changelog_url);
                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

                changelog = formatChangelog(await response.text());
            } catch (e) {
                this.api.Logger.warn(`Could not get changelog: ${e}`);
                return;
            }

            if (changelog.length > 0) {
                this.api.UI.showChangelogModal({
                    title: `What's new in FixDiscordCss v${config.info.version}?`,
                    blurb: `Did something break in this update? Do you want a new feature? Let us know at: ${config.info.github}/issues`,
                    changes: changelog,
                    footer: this.api.React.createElement('div'),
                })
            }
        }
    }

    updateVersion() {
        if (this.compareVersions(this.version, config.info.version) <= 0) {
            this.version = config.info.version;
            this.api.Data.save('version', this.version);
        }
    }

    start() {
        this.handleNodes(document.head.querySelectorAll('link[rel="stylesheet"]'));
    }

    handleNodes(nodes) {
        for (const node of nodes) {
            if (node.nodeType !== Node.ELEMENT_NODE || !node.matches('link[rel="stylesheet"]')) return;

            const linkNode = node;

            if (linkNode.sheet) {
                this.cleanSheet(linkNode.sheet);
            } else {
                if (linkNode.sheet === null) {
                    node.addEventListener("load", () => this.cleanSheet(linkNode.sheet), { once: true });
                }
            }
        }
    }

    cleanSheet(sheet) {
        try {
            const rules = sheet.cssRules;
            if (!rules) return;

            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];

                if (rule.selectorText?.includes(":has(.gameOption_")) {
                    this.api.Logger.info("Removed problematic CSS rule", rule.cssText);
                    sheet.deleteRule(i);
                    break;
                }
            }
        } catch (e) { 
            this.api.Logger.error(e);
        }
    }

    observer(mutation) {
        this.handleNodes(mutation.addedNodes);
    }

    stop() { }
};
