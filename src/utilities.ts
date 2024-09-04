/**
 * Scales vectors to ≤ 1 unit length where vectors that started with a length greater than max
 * are clamped to length 1, and shorter vectors are scaled between 0 - 1 based on their original
 * fraction of their length relative to max.
 * @param x x component of the vector
 * @param y y component of the vector
 * @param max the length of the vector to clamp to
 * @returns the scaled vector as an object with x and y components.
 */
export function NormalizeClampVector(x: number, y: number, max: number) {
    const length = Math.sqrt(x * x + y * y);
    if (length > max) return { x: x / length, y: y / length };
    else return { x: x / max, y: y / max };
}

/** Sets the transform-origin css property of the passed element to the center of its BBOX (svg) or transform rect (html) as a pixel coordinate.
 * This is intened mainly for elements that will not be moved except with the transform css property or svg attribute (relative to its parent).
 * If the passed element is moved by another method (margin, top, flex, etc...) you must call this again to update the transform-origin.
 * On newer browsers this function can often be replaced with ```transform-box: fill; transform-origin: 50% 50%``` properties on svg elements
 * @param element The element to set the transform-origin of.
 */
export function CenterTransformOrigin(element: HTMLElement | SVGGraphicsElement) {
    if (element instanceof SVGGraphicsElement) {
        if ((element).getAttribute('transform')) console.warn('VirtualGamepadLib: Setting Transform origin on an element that already has a transform attribute. This may break the transform!', element);
        const rect = element.getBBox();
        element.style.transformOrigin = `${rect.x + rect.width / 2}px ${rect.y + rect.height / 2}px`;
    } else if (element instanceof HTMLElement) {
        console.warn('VirtualGamepadLib: Setting Transform origin on an element that is not an SVG element. This may break the transform!', element);
        const rect = element.getBoundingClientRect();
        element.style.transformOrigin = `${rect.width / 2}px ${rect.height / 2}px`;
    }
}

/** Adds a visual shaded box around the bbox or bounding rect of the passed element for debugging
 * @param element The element to show the visual bounding box of
 */
export function CenterTransformOriginDebug(element: HTMLElement | SVGGraphicsElement) {
    if (element instanceof SVGGraphicsElement) {
        const rect = element.getBBox();
        const debugRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        debugRect.setAttribute('fill', "#FF0000A0");
        debugRect.setAttribute('x', rect.x.toString());
        debugRect.setAttribute('y', rect.y.toString());
        debugRect.setAttribute('width', rect.width.toString());
        debugRect.setAttribute('height', rect.height.toString());
        element.insertAdjacentElement('afterend', debugRect);
    } else if (element instanceof HTMLElement) {
        console.warn('VirtualGamepadLib: Setting Transform origin on an element that is not an SVG element. This may break the transform!', element);
        const rect = element.getBoundingClientRect();
        const debugRect = document.createElement('div');
        debugRect.style.position = "absolute";
        debugRect.style.backgroundColor = "#FF0000A0";
        debugRect.style.left = rect.left.toString();
        debugRect.style.top = rect.top.toString();
        debugRect.style.width = rect.width.toString();
        debugRect.style.height = rect.height.toString();
        element.insertAdjacentElement('afterend', debugRect);
    }
}
