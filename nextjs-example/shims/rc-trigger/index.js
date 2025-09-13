// Minimal shim for rc-trigger to avoid React 18 compatibility issues
// This provides a basic trigger component that works with React 18

import React from 'react';

// Props that should not be passed to DOM elements
const TRIGGER_PROPS = new Set([
    'popup',
    'popupVisible',
    'onPopupVisibleChange',
    'popupAlign',
    'builtinPlacements',
    'popupPlacement',
    'destroyPopupOnHide',
    'getPopupContainer',
    'popupStyle',
    'popupAnimation',
    'popupTransitionName',
    'prefixCls',
    'action',
    'trigger',
    'popupClassName',
    'mouseEnterDelay',
    'mouseLeaveDelay',
    'focusDelay',
    'blurDelay',
    'mask',
    'maskClosable',
    'onPopupAlign',
    'stretch',
    'alignPoint',
    'autoDestroy',
    'mobile'
]);

// Simple trigger component that just renders children without trigger-specific props
const Trigger = React.forwardRef((props, ref) => {
    const { children, ...restProps } = props;

    // Filter out trigger-specific props to avoid React warnings
    const cleanProps = {};
    Object.keys(restProps).forEach(key => {
        if (!TRIGGER_PROPS.has(key)) {
            cleanProps[key] = restProps[key];
        }
    });

    // Clone the child element with clean props and ref
    return React.cloneElement(children, { ref, ...cleanProps });
});

Trigger.displayName = 'Trigger';

export default Trigger;
export { Trigger };