

myRAMLtoPostman = function (inputPath) {
    console.log('Starting the script...');
    console.log('+++++++++++++++++++++++');
    const { Console } = require('console'); 
    
    var path = require('path');
    var fs = require('fs');

    const { Collection, Item, Header } = require('postman-collection');

    Converter = require('raml1-to-postman');
    //use to remove the raml type of framents
    const regexTraitsFile = /#%RAML.*/gm;

    //Find the main raml from given path
    console.log('Finding the main raml from given path');
    function fromDir(startPath, filter) {

        console.log('Starting from dir '+startPath+'/');
        if (!fs.existsSync(startPath)) {
            console.log("not a legit folder ", startPath);
            return;
        }
        var files = fs.readdirSync(startPath);
        //console.log("files are:", files);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            if (filename.endsWith(filter)) {
                console.log('-- found: ', filename);
                return filename;
            };
        };
        console.log("no raml ", startPath);
    };

    //extract the pull path to the main raml
    console.log('Extracting the pull path to the main raml');
    fullPath = fromDir(inputPath, '.raml');
    console.log('Extracting full path: ', fullPath);

    const regexFileName = /\\(?:.(?!\\))+$/gm;

    const fileName = fullPath.match(regexFileName)[0].replace('\\','');
    console.log('Extracting fileName: ',fileName);

    const mainPathWithoutFile = fullPath.replace(fileName,'');
    console.log('Extracting mainPathWithoutFile: ',mainPathWithoutFile);

    //create an empty postman collection
    console.log('Create an empty postman collection...');
    const postmanCollection = new Collection({
        info: {
          // Name of the collection
          name: fileName.replace('.raml','')
        },
        // Requests in this collection
        item: [],
      });

    //read the main RAML
    if (fs.existsSync(fullPath)) {
        mainRamlSpec = fs.readFileSync(fullPath, {encoding: 'UTF8'});
    }

    //'is' conversion workaround
    function calculateStartWhiteSpaces(index, lineArray, before){
        //give the line, index and the array calculate the next non empty line start white spaces
        console.log('Calculating White Space of the next non empty line', index, lineArray[index]);
        let direction;
        if(before){
            direction = -1;
        }else{
            direction = 1;
        }
        let lineFollowingWhiteSpace = 0;
        let lineFollowing = '';
        for (let i = 0; (lineArray[index+direction*i] != undefined && !(lineArray[index+direction*i].trim())) || i == 0; i++) {
            if(lineArray[index+direction*(i+1)] != undefined && lineArray[index+direction*(i+1)].trim()){
                lineFollowing = lineArray[index+direction*(i+1)];
                
            }
        }
        lineFollowingWhiteSpace = lineFollowing.length - lineFollowing.trimStart().length;
        return {lineFollowing, lineFollowingWhiteSpace};
    }

    function convertIsSyntax (lineArray, ramlSpec, index, method){
        let i = index;
        let isString = ''; 
        let afterString = '';
        let restCode = '200';
        let convertedString = '';
        if(method == 'post'){
            restCode = '201';
        }
        console.log('new call lineArray[i]',i , lineArray[i]);
        
        let numberOfSpaces = lineArray[index].length - lineArray[index].trimStart().length;
        let inputAfterString = 
                        'body:' + '\n'.padEnd(numberOfSpaces+2,' ') 
                        + 'application/json:' + '\n'.padEnd(numberOfSpaces+3,' ');
        while(lineArray[i] != undefined && lineArray[i].trim() 
                && !lineArray[i].includes('get:')
                    && !lineArray[i].includes('put:')
                        && !lineArray[i].includes('post:')
                            && !lineArray[i].includes('delete:')
                                && (!lineArray[i-1].includes(']'))){
            let convertedLine = '';
            let lineArrayLowerCase = lineArray[i].toLowerCase(); 
                                        
            if((/is\s*:\s*\[.*/g).test(lineArray[i])){
                if(method == 'post' || method == 'put'){
                    convertedString = inputAfterString + 'inputexample:' + '\n'.padEnd(numberOfSpaces+1,' ');;
                }
                convertedString = convertedString +  'responses:' + '\n'.padEnd(numberOfSpaces+2,' ') 
                        + restCode + ':' + '\n'.padEnd(numberOfSpaces+3,' ') 
                        + 'body:' + '\n'.padEnd(numberOfSpaces+4,' ') 
                        + 'application/json:' + '\n'.padEnd(numberOfSpaces+5,' ') 
                        + 'example:' + '\n'.padEnd(numberOfSpaces+6,' ') 
                convertedLine = lineArray[i].replace(/is\s*:\s*\[.*/g,convertedString);
                
            }else if(lineArrayLowerCase.includes('example') 
                        && (lineArray[i].includes('.raml') ||  lineArray[i].includes('.json'))){
                    let includeExampleLine = lineArray[i].match(/!include.*(\.raml|\.json)/);
                    if(includeExampleLine == undefined){
                        console.log('is includeExampleLine', lineArray[i]);
                    }
                    if(!lineArrayLowerCase.includes('output') && (method == 'post' || method == 'put' || method == 'delete')){
                        if(afterString.includes('inputexample:')){
                            afterString = afterString.replace('inputexample:','example:'+ '\n'.padEnd(numberOfSpaces+4,' ')
                                + includeExampleLine[0]);
                        }else if(method == 'delete'){
                            deleteInputString = inputAfterString + 'example:' + '\n'.padEnd(numberOfSpaces+4,' ') + includeExampleLine[0]
                                                        + '\n'.padEnd(numberOfSpaces+1,' ');
                            afterString = afterString.replace('responses:',deleteInputString + 'responses:')
                        }
                    }
                    else{
                        convertedLine = includeExampleLine[0] + '\n';
                    }
            }else{
                convertedLine ='';
            }
            afterString = afterString + convertedLine;
            if(lineArray[i+1]){
                isString = isString + lineArray[i] + '\n';
            }else{
                isString = isString + lineArray[i];
            }
            i++
        }
        console.log('isString\n', isString);
        console.log('afterString\n', afterString);
        
        ramlSpec = ramlSpec.replace(isString,afterString);
        return ramlSpec;
    }


    //var isConvLineArray = mainRamlSpec.split('\n');
    var tempLineArray = mainRamlSpec.split('\n');
    tempLineArray.forEach((line, index) =>{
        if((/is\s*:\s*\[.*/g).test(line)){
            let lineWhiteSpace = line.length - line.trimStart().length;
            //give the line, index and the array calculate the next non empty line start white spaces      
            let {lineFollowing,lineFollowingWhiteSpace} = new calculateStartWhiteSpaces(index, tempLineArray, true);
            console.log('lineFollowing is: ',lineFollowing);
            if((lineFollowingWhiteSpace > lineWhiteSpace) 
                    || lineFollowing.includes('get:')
                    || lineFollowing.includes('put:')
                    || lineFollowing.includes('post:')
                    || lineFollowing.includes('delete:')){
                
                for (let i = 0; (!tempLineArray[index-i].includes('get:')
                && !tempLineArray[index-i].includes('put:')
                && !tempLineArray[index-i].includes('post:')
                && !tempLineArray[index-i].includes('delete:')); i++) {
                    if(tempLineArray[index-(i+1)].includes('get:')){
                        mainRamlSpec = convertIsSyntax(tempLineArray,mainRamlSpec,index,'get');
                    //Convert post is
                    }else if(tempLineArray[index-(i+1)].includes('post:')){
                        mainRamlSpec = convertIsSyntax(tempLineArray,mainRamlSpec,index,'post');
                    //Convert put is
                    }else if(tempLineArray[index-(i+1)].includes('put:')){
                        mainRamlSpec = convertIsSyntax(tempLineArray,mainRamlSpec,index,'put');
                    //Convert delete is
                    }else if(tempLineArray[index-(i+1)].includes('delete:')){
                        mainRamlSpec = convertIsSyntax(tempLineArray,mainRamlSpec,index,'delete');
                    }
                    
                }
            }
        } 
    });
    console.log('mainRamlSpec after is converted', mainRamlSpec);

    //function to add fragments from files into RAML
    function addingFragments (mainRamlSpec, mainPathWithoutFile){
        //Array of all line in raml
        var lineArray = mainRamlSpec.split('\n');

        //find raml fragments
        const includeWholeLineRAMLRegex = /.*!include.*\.raml/g;
        var includeWholeLineRAML = mainRamlSpec.match(includeWholeLineRAMLRegex);
        
        //find json fragments
        const includeWholeLineJSONRegex = /.*!include.*\.json/g;
        var includeWholeLineJSON = mainRamlSpec.match(includeWholeLineJSONRegex);
        
        // find lib
        //'library' conversion
        var libWholeLine = lineArray.filter(line => ((!line.includes('!include')) && line.includes('.raml')));
        libWholeLine.forEach((line, index) =>{
            libWholeLine[index] = line.trim();
        });
        
        //combine all arrays
        var includeArrayWholeLine = [];
        if(includeWholeLineRAML!= null){
            includeArrayWholeLine = includeWholeLineRAML;
        }
        if(includeWholeLineJSON!= null){
            includeArrayWholeLine = includeArrayWholeLine.concat(includeWholeLineJSON);
        }
        if(libWholeLine!= null){
            includeArrayWholeLine = includeArrayWholeLine.concat(libWholeLine);
        }
        //calculate white spaces
        var includeWhiteSpacesArray = [];
        includeArrayWholeLine.forEach(includeWholeLineElement => includeWhiteSpacesArray.push(includeWholeLineElement.length - includeWholeLineElement.trimStart().length));

        //Processing each fragments path in the raml
        includeArrayWholeLine.forEach((includePathElement, index) => 
            {
                //console.log('includePathElement',includePathElement);
                if(includePathElement.includes('!include')){
                    includePathElement = includePathElement.match(/!include.*/gm)[0];
                }else{
                    var libvar = includePathElement.replace(/(^.*):(.*)/gm,'$1');
                    includePathElement = includePathElement.replace(/(^.*):(.*)/gm,'$2');
                    mainRamlSpec = mainRamlSpec.replaceAll(/uses:/g,'');
                }
                includePathElement = includePathElement.trim();
                var includeFileRelPath = includePathElement.replace('!include', '');
                var includeRelPathWithoutFile = includeFileRelPath.replace(regexFileName,'/');;
                var includeFileFullPath = mainPathWithoutFile.concat(includeFileRelPath).replaceAll(' ','');
                
                if (fs.existsSync(includeFileFullPath)) {
                    includeFileFullPath = includeFileFullPath.replaceAll('/','\\');
                    ramlFragment = fs.readFileSync(includeFileFullPath, {encoding: 'UTF8'});
                }
                //Path is wrong, shouldn't happen
                else{
                    ramlFragment = '';
                }
                
                //check if fragments have include 
                if(ramlFragment.includes('!include')){
                    ramlFragment = ramlFragment.replaceAll(/!include (\w)/gm,'!include ' + includeRelPathWithoutFile + '$1');
                    ramlFragment = ramlFragment.replaceAll(/!include \//gm,'!include ' + includeRelPathWithoutFile);
                    
                }
                //Replace .. with the right path
                //FIXME: maybe there will be ../../?
                if(ramlFragment.includes('../')){
                    const includeRelPathWithoutFileParentRegex = /.*[^\/](?=[^\/]*\/)/gm
                    var includeRelPathWithoutFileParentMach = includeRelPathWithoutFile.match(includeRelPathWithoutFileParentRegex);
                    if(includeRelPathWithoutFile.match(includeRelPathWithoutFileParentRegex)[0] == null){
                        console.log('includePathElement',includePathElement);
                        console.log('includeRelPathWithoutFileParentMach == null',includeRelPathWithoutFileParentMach);
                    }
                    var includeRelPathWithoutFileParent = includeRelPathWithoutFileParentMach[0];
                    includeRelPathWithoutFileParent = includeRelPathWithoutFileParentMach[0] + '/';
                    const fragmentsTwoDotRegex = /\s(\.\.*\/)/gm;
                    ramlFragment = ramlFragment.replaceAll(fragmentsTwoDotRegex,' ' + includeRelPathWithoutFileParent);
                }
                //Replacing includes with content       
                if(includePathElement.includes('type')|| ramlFragment.includes('#%RAML 1.0 DataType')){
                    //manipulate white space 
                    const paddedNewLine = '\n'.padEnd(includeWhiteSpacesArray[index]+2,' ');
                    ramlFragment = ramlFragment.replaceAll('\n',paddedNewLine);
                    const regex2 = /(properties.*)/s;
                    if(ramlFragment.match(regex2) != null){
                        ramlFragment = paddedNewLine + ramlFragment.match(regex2)[0];
                    }
                }
                //FIXME: a lot of space
                else if(includePathElement.includes('example')|| includePathElement.includes('.json')|| ramlFragment.includes('#%RAML 1.0 NamedExample')){
                    const paddedNewLine = '\n'.padEnd(includeWhiteSpacesArray[index]+2,' ');
                    ramlFragment = ramlFragment.replaceAll('\n',paddedNewLine);
                    ramlFragment = paddedNewLine + ramlFragment;
                }
                else if(includePathElement.includes('trait')|| ramlFragment.includes('#%RAML 1.0 Trait')){
                    //manipulate white space 
                    //console.log('Replacing traits')
                    const paddedNewLine = '\n'.padEnd(includeWhiteSpacesArray[index]+2,' ');
                    ramlFragment = ramlFragment.replaceAll('\n',paddedNewLine);
                //FIXME: Lib is not working yet
                }else if(ramlFragment.includes('#%RAML 1.0 Library')){
                    //console.log('Replacing Library')
                    const paddedNewLine = '\n'.padEnd(includeWhiteSpacesArray[index],'');
                    //TODO: Remove Lib var
                    libVarRegex = libvar+'(:|.)';
                    var libVarRegexObj = new RegExp(libVarRegex,"g");
                    mainRamlSpec = mainRamlSpec.replaceAll(libVarRegexObj,'');
                    //ramlFragment = ramlFragment.replaceAll('\n',paddedNewLine);
                    ramlFragment = '';
                }
                else{
                    //console.log('Replacing other type')
                    const paddedNewLine = '\n'.padEnd(includeWhiteSpacesArray[index]+2,' ');
                    ramlFragment = ramlFragment.replaceAll('\n',paddedNewLine);
                }
                //remove first line
                ramlFragment = ramlFragment.replace(regexTraitsFile,'');  
                //console.log('Ending includePathElement: ',includePathElement); 
                mainRamlSpec = mainRamlSpec.replace(includePathElement,ramlFragment);
            });
        return mainRamlSpec;
    }

    //replace all includes
    var newRamlSpec = mainRamlSpec;
    var i = 0;
    //newRamlSpec = addingFragments(newRamlSpec,mainPathWithoutFile);
    while((newRamlSpec.includes('.raml')|newRamlSpec.includes('.json')) && i<100){
        console.log('adding fragments ' +i+' while loop...');
        newRamlSpec = addingFragments(newRamlSpec,mainPathWithoutFile);
        fs.writeFile('newRAMLSpec_'+i+'.raml', newRamlSpec, (err) => {
            if (err) { console.log(err); }
            console.log('newRAMLSpec saved');
        });
        i++;
    }
    
    
    

    //add this request for a workaround of the bug
    fakeRequest = '/fakequest: \n  post:\n    body:\n     application/json:\n    responses:\n      200:\n        body:\n          application/json:\n            example: {"code": 200,"status": "OK"}\n\n';
    regexFirstRequest = /^\s*\/.*/gm;
    firstRequest = newRamlSpec.match(regexFirstRequest)[0];
    newRamlSpec = newRamlSpec.replace(firstRequest,fakeRequest + firstRequest);

    //Adding enviroment elements
    function replaceObjectValue(obj){
        for(const key of Object.keys(obj)){
         if (typeof obj[key] === 'object'){
            replaceObjectValue(obj[key]);
         }
         if (key === 'header'){
            if(obj[key] != null){
                obj[key].forEach((element, index) =>{
                    if(element.key != 'Content-Type'){
                        element.value = '{{'+element.key+'}}' 
                    }
                })
            }
         }
        }
    };

    //convert raml to postman collection
    Converter.convert({ type: 'string', data: newRamlSpec, options:
        {
            collapseFolders: true,
            requestParametersResolution: 'Example',
            exampleParametersResolution: 'Example'
        }},
    {}, (err, conversionResult) => {
        if (!conversionResult.result) {
        console.log('Could not convert true', conversionResult.reason);
        }
        else {
            //console.log('The collection object is: ', conversionResult.output[0].data);
            conversionResult.output[0].data.item.shift();
            console.log('The collection object is: ', conversionResult.output[0].data);
            postmanCollection.items.add(conversionResult.output[0].data);
            const collectionJSON = postmanCollection.toJSON();
            replaceObjectValue(collectionJSON);
            fs.writeFile(fileName.replace('.raml','') + '-collection' + '.json', JSON.stringify(collectionJSON), (err) => {
                if (err) { console.log(err); }
                console.log('File saved');
            });
        }
    }
    ); 
}; 

//call the function
//myFun('/Users/work/Desktop/Mainova/api/s-ams-api.raml');
myRAMLtoPostman(process.argv[2]);