import { Dropdown, type DropdownProps } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ css, token }) => ({
	codexOverlay: css`
		.ant-dropdown-menu {
			padding: 4px;
			border-radius: 12px;
			border: 1px solid ${token.colorBorderSecondary};
			background: ${token.colorBgContainer};
			box-shadow:
				0 8px 24px rgba(15, 23, 42, 0.08),
				0 2px 6px rgba(15, 23, 42, 0.05);
		}

		&& .ant-dropdown-menu .ant-dropdown-menu-item-group-title {
			padding: 2px 8px 6px;
			font-size: 11px;
			line-height: 16px;
			font-weight: 400;
			letter-spacing: 0;
			color: ${token.colorTextTertiary};
		}

		.ant-dropdown-menu-item-group-list {
			margin: 0 !important;
			padding: 0 !important;
		}

		.ant-dropdown-menu-submenu .ant-dropdown-menu {
			margin: 0 !important;
		}

		&& .ant-dropdown-menu .ant-dropdown-menu-item,
		&& .ant-dropdown-menu .ant-dropdown-menu-submenu-title {
			margin: 0;
			padding: 6px 8px;
			min-height: 34px;
			font-size: 13px;
			line-height: 20px;
			border-radius: 8px;
			transition: background-color 0.16s ease, color 0.16s ease;
		}

		.ant-dropdown-menu-item-icon {
			color: ${token.colorTextTertiary};
		}

		.ant-dropdown-menu-title-content {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			gap: 8px;
		}

		&& .ant-dropdown-menu .ant-dropdown-menu-item-selected,
		&& .ant-dropdown-menu .ant-dropdown-menu-item-selected:hover {
			background: ${token.colorFillSecondary};
			color: ${token.colorText};
			font-weight: 500;
		}

		&& .ant-dropdown-menu .ant-dropdown-menu-item:hover,
		&& .ant-dropdown-menu .ant-dropdown-menu-submenu-title:hover,
		&& .ant-dropdown-menu .ant-dropdown-menu-item-active,
		&& .ant-dropdown-menu .ant-dropdown-menu-submenu-title-active {
			background: ${token.colorFillTertiary};
			color: ${token.colorText};
		}

		.ant-dropdown-menu-item-selected .ant-dropdown-menu-item-icon {
			color: ${token.colorTextSecondary};
		}

		.ant-dropdown-menu-item-selected .ant-dropdown-menu-title-content::after {
			content: "✓";
			color: ${token.colorTextSecondary};
			font-size: 12px;
			font-weight: 600;
			line-height: 1;
		}
	`,
}));

type StyledDropdownVariant = "codex" | "default";

export type StyledDropdownProps = DropdownProps & {
	variant?: StyledDropdownVariant;
};

export function StyledDropdown({
	variant = "codex",
	overlayClassName,
	...props
}: StyledDropdownProps) {
	const { styles, cx } = useStyles();
	const mergedOverlayClassName =
		variant === "codex"
			? cx(styles.codexOverlay, overlayClassName)
			: overlayClassName;

	return (
		<Dropdown
			{...props}
			overlayClassName={mergedOverlayClassName}
		/>
	);
}
