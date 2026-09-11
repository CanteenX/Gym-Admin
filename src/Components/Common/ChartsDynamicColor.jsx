const getChartColorsArray = (colors) => {
    colors = JSON.parse(colors);
    return colors.map(function (value) {
        const newValue = value.replace(" ", "");
        if (newValue.includes(",")) {
            const val = value.split(',');
            if (val.length === 2) {
                let rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
                rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
                return rgbaColor;
            } else {
                return newValue;
            }
        } else {
            let color = getComputedStyle(document.documentElement).getPropertyValue(newValue);

            if (color.includes("#"))
                color = color.replace(" ", "");
            if (color) return color;
            else return newValue;
        }
    });
};

export default getChartColorsArray;