/** splits svg id into an id and class names
Based on: https://forum.affinity.serif.com/index.php?/topic/35556-custom-css-classes-and-ids-per-group-and-paths-on-svg/&do=findComment&comment=455620

Example:
```html
    <path id="thisIsAnId.className1.className2" />
        becomes:
    <path id="thisIsAnId" class="className1 className2" />
```
*/
export default { //  use module.exports = { ...stuff... }  for commonjs
    type: 'perItem',
    name: 'idClassSplitter',
    fn: function (item) {

        if (item.isElem() && item.hasAttr('id')) {
            let classes = item.attr('id').value.split('.');
            if (classes.length == 1) return;
            let id = classes.shift();
            if (id[0] == '#') id = id.substring(1); // remove leading #
            const classNames = classes.join(" ")//.replace("  ", " ").trim();

            // Add the classes
            if (classNames != "") {
                item.addAttr({
                    name: 'class',
                    value: '',
                    prefix: '',
                    local: 'class'
                })
                item.class.setClassValue(classNames)
            }

            // replace the id
            item.removeAttr('id')
            if (id && id !== '') item.addAttr({
                name: 'id',
                value: id,
                prefix: '',
                local: 'id'
            });

        }
    }
}
