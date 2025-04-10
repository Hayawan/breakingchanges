import { Modal, Anchor, Group, ScrollArea } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeExternalLinks from 'rehype-external-links';
import styles from '@/styles/UpgradeGuideModal.module.css';

export function UpgradeGuideModal() {
  const [opened, { open, close }] = useDisclosure(false);

  const modalContent = `
# 🔧 Best Practices for Upgrading Dependencies

Upgrading dependencies is a key part of maintaining a healthy application. Whether you're addressing security issues, performance improvements, or gaining access to new features, the goal is to upgrade confidently without breaking your app. Here's a practical guide to help you do just that.

## 🚨 Understanding Breaking Changes

Breaking changes are updates that require you to modify your code to remain compatible with the new version. These often include:

- Removed or renamed functions  
- Changed function parameters  
- Modified behavior of existing features  
- Dropped support for older platforms or features  

Identifying and adapting to these changes is critical during upgrades.

## 🧭 Upgrade Strategies

### 1. Read the Release Notes

Before upgrading, read through the release notes for every version between the one you're using and the target version. Focus on:

- **Breaking changes** sections  
- **Migration guides** from maintainers  
- **Deprecation notices** so you can adapt early  
- **New features** that could impact or simplify your code  

### 2. Test in Isolation

Avoid upgrading directly in your main production branch. Instead:

- Create a feature or test branch  
- Upgrade one dependency at a time, especially for major versions  
- Run your full test suite  
- Validate workflows manually to catch subtle runtime issues  

### 3. Use Automated Tools

Modern tooling makes upgrades easier:

- \`npm-check-updates\` – identifies which packages are outdated  
- \`depcheck\` – flags unused dependencies  
- \`npm audit\` – checks for known security vulnerabilities  

These can save time and reduce manual effort.

### 4. Plan Your Migration

Treat larger upgrades as projects:

- Build a timeline for the upgrade  
- Document which breaking changes affect your code  
- Prepare a rollback plan  
- Use feature flags or gradual rollouts if needed  

Proactive planning minimizes disruption.

### 5. Update Your Codebase

Once you're clear on what needs changing:

- Follow official migration guides  
- Refactor deprecated usages in advance when possible  
- Update or add tests to reflect any changed behavior  
- Document any workarounds or known issues  

This ensures your upgrade is stable and maintainable long-term.

## 📘 How to Read Changelogs Effectively

Release notes and changelogs vary by project, but here's how to make sense of them:

- **Start from your current version** and read forward through each release  
- Pay attention to structured sections like:
  - *Breaking Changes* – these often require direct code updates  
  - *Deprecations* – still usable now but will be removed soon  
  - *New Features* – can replace older methods or simplify logic  
  - *Bug Fixes* – usually safe, but verify if they impact your use cases  
- Use changelogs to map what parts of your app may need refactoring  

If available, use migration guides—they condense complex upgrades into actionable steps.

## 🎯 Prioritizing Upgrade Work

Not all dependency updates are equally urgent. Here's how to triage:

### High Priority
- Breaking changes that affect app startup, APIs, or user-facing features  
- Security patches or fixes for critical vulnerabilities  

### Medium Priority
- Deprecated APIs you currently rely on  
- Changes affecting performance or compatibility  

### Low Priority
- Optional new features that don't impact existing functionality  

By ranking updates this way, you can focus effort where it matters most.

## ⚠️ Common Pitfalls to Avoid

Even experienced teams can run into trouble. Here are a few common mistakes:

- Skipping intermediate release notes  
- Upgrading multiple major versions at once  
- Ignoring deprecation warnings until they break something  
- Inadequate testing before deployment  
- Forgetting to update related documentation  

Avoiding these pitfalls can save time, frustration, and production issues.

## 📚 Resources

Here are some helpful resources to support your upgrade process:

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) – Learn how structured changelogs help upgrades  
- [It's Worth Regularly Updating Dependencies](https://felixcrux.com/blog/it-is-worth-regularly-updating-dependencies) – A case for consistent maintenance over big-bang upgrades  
- [Best Practices for Versioning After Dependency Upgrades](https://softwareengineering.stackexchange.com/questions/168647/best-practices-for-versioning-project-after-dependency-upgrade) – How upgrading affects your own versioning strategy  
- [Approaching a Major Version Dependency Upgrade](https://medium.com/@ericapisani/approaching-a-major-version-dependency-upgrade-82e56fd1427c) – A step-by-step guide to handling significant upgrades  

---

With thoughtful planning, good tooling, and smart prioritization, upgrading dependencies can be a smooth process—and one that keeps your app secure, modern, and maintainable.
  `;

  return (
    <>
      <Modal 
        opened={opened} 
        onClose={close} 
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
        title="🔧 Best Practices for Upgrading Dependencies"
      >
        <div className={styles.modalContent}>
          <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeExternalLinks, {target: '_blank'}]]}>
            {modalContent}
          </ReactMarkdown>
        </div>
      </Modal>

      <Group gap="xs">
        <IconHelp size={16} />
        <Anchor 
          component="button" 
          type="button" 
          onClick={open}
          className={styles.helpLink}
        >
          Not sure where to start? Read some best practices for upgrading dependencies
        </Anchor>
      </Group>
    </>
  );
} 