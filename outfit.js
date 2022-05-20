const tops = [0,1,2,3,4,5,6,7,8,9]
const bottoms = [0,1,2,3,4,5,6,7,8,9]

const generateOutfit = async function() {
    const top = tops[Math.floor(Math.random() * tops.length)]
    const bottom = bottoms[Math.floor(Math.random() * bottoms.length)]
    const outfit = {
        top: top,
        bottom: bottom
    }
    return outfit
}

//Export
module.exports = generateOutfit;