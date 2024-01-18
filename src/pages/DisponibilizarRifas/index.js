import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, Alert, View, Text, ActivityIndicator, Keyboard, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import Botao from '../../componentes/Botao';
import { AreaCapa, Texto, Input, TextoMensagemCadastro, InputQtd } from './styles';
import {
    gravaRifaALiberarTransacao, obtemGeneros
} from '../../servicos/firestore';
import estilos from '../../estilos/estilos';
import { salvaImagem } from '../../servicos/storage';
import { AuthContext } from '../../contexts/auth';
import ModalDropdown from 'react-native-modal-dropdown';
import capabranca from '../../assets/maqfotografica.png';
import ImagePicker from 'react-native-image-crop-picker';
import uuid from 'react-native-uuid';
import { useNavigation } from '@react-navigation/native';

export default function DisponibilizarRifas() {
    console.log('DisponibilizarRifas');
    const [mensagemCadastro, setMensagemCadastro] = useState('');
    const [titulo, setTitulo] = useState('');
    const [autorizacao, setAutorizacao] = useState('');
    const [descricao, setdescricao] = useState('');
    const [genero, setGenero] = useState(' Escolha a categoria');
    const [descricaoGenero, setDescricaoGenero] = useState([]);
    const [qtdNrs, setQtdNrs] = useState(0);
    const [vlrBilhete, setVlrBilhete] = useState(0);
    const [imagemCapa, setImagemCapa] = useState('');
    const [load, setLoad] = useState(false);
    const { user: usuario } = useContext(AuthContext);
    const navigation = useNavigation();
    var qtdNrsValidos = [10, 100, 1000, 10000, 100000];
    var regra = /^[0-9]+$/;

    useEffect(() => {
        carregaGenerosList();
    }, []);

    async function carregaGenerosList() {
        console.log('carregaGenerosList');
        setLoad(true)
        const generosRifasFirestore = await obtemGeneros()
        var descricaoGeneroArray = []
        for (var g = 0; g < generosRifasFirestore.length; g++) {
            const descrGenero = generosRifasFirestore[g].genero;
            descricaoGeneroArray.push(descrGenero);
        }
        setDescricaoGenero(descricaoGeneroArray)
        setLoad(false)
    }

    async function disponibilizarRifa() {
        console.log('disponibilizarRifa: ' + genero + '-' + qtdNrs);
        Keyboard.dismiss();
        setMensagemCadastro('')
        if (titulo == '' || titulo.length === 0) {
            console.log('titulo: ' + titulo);
            setMensagemCadastro('Digite o título');
        } else if (descricao == '' || descricao.length === 0) {
            console.log('descricao: ' + descricao);
            setMensagemCadastro('Digite a descricao');
        } else if (genero === ' Escolha a categoria' || typeof genero === "undefined") {
            console.log('genero: ' + genero);
            setMensagemCadastro('Escolha a categoria')
        } else if (typeof qtdNrs === "undefined" || !qtdNrsValidos.includes(parseInt(qtdNrs))) {
            setMensagemCadastro('Informe uma quantidade valida de nrs da rifa (10,100,1000,10000 ou 100000')
        } else if (typeof vlrBilhete === "undefined" || isNaN(vlrBilhete) || vlrBilhete == 0 || vlrBilhete < 0 || !vlrBilhete.match(regra)) {
            setMensagemCadastro('Informe valor do bilhete (somente inteiros. Ex: 10, 25, 50')
        } else {
            gravarRifa();
        }
    }

    async function gravarRifa() {
        console.log('gravarRifa')
        setMensagemCadastro('')
        if (imagemCapa == '') {
            setMensagemCadastro('Escolha uma foto da Rifa')
            return
        }
        setLoad(true)
        console.log('inicio salvar imagem')
        let nomeImagem = titulo.trim() + '-' + uuid.v4();
        const urlImagemCapa = await salvaImagem(imagemCapa, nomeImagem);
        if (!urlImagemCapa) {
            setMensagemCadastro('Ops, foto da rifa não conseguiu ser gravada. Verifique sua conecxão com a internet. Tente novamente')
            setLoad(false)
            return
        }
        console.log('fim salvar imagem')
        let dadosRifa = {
            titulo: titulo,
            descricao: descricao,
            imagemCapa: urlImagemCapa,
            genero: genero,
            uid: usuario.uid,
            cep: usuario.cep,
            cidade: usuario.cidade,
            uf: usuario.uf,
            bairro: usuario.bairro,
            nome: usuario.nome,
            email: usuario.email,
            nomeCapa: nomeImagem,
            post: 'imagemRifa',
            qtdNrs: parseInt(qtdNrs),
            autorizacao: autorizacao,
            vlrBilhete: parseInt(vlrBilhete)
        }

        const resultado = await gravaRifaALiberarTransacao(dadosRifa);
        console.log('resultado gravaRifaALiberarTransacao: ' + resultado);
        if (resultado == 'sucesso') {
            setTitulo('')
            setImagemCapa('')
            setdescricao('')
            setAutorizacao('')
            setVlrBilhete('')
            setGenero(' Escolha a categoria')
            setQtdNrs('')
            setMensagemCadastro('Os dados da Rifa serao analisados em breve. Estando de acordo com a politica da plataforma, a Rifa sera disponibilizada. Caso contrario, sera rejeitada.')
            setTimeout(() => {
                navigation.navigate('Ok')
            }, 6000);
        }
        else {
            setMensagemCadastro(resultado)
            setLoad(false)
            return
        }
}

function selecionarCapa() {
    console.log('selecionarCapa')
    Alert.alert(
        "Selecione",
        "Informe de onde você vai obter a foto",
        [
            {
                text: "Cancelar",
                onPress: () => cancelarSelecionarCapa(),
                style: "cancel"
            },
            {
                text: "Galeria",
                onPress: () => obterImagemGaleria(),
                style: 'default'
            },
            {
                text: "Câmera",
                onPress: () => obterImagemCamera(),
                style: 'default'
            }
        ]
    );
}

async function cancelarSelecionarCapa() {
    return
}

async function obterImagemGaleria() {
    console.log('obterImagemGaleria')
    setMensagemCadastro('')
    ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        compressImageQuality: 0.9
    }).then(image => {
        console.log(image);
        if (image.size > 614488) {
            setMensagemCadastro('Tamanho da foto maior que o permitido')
            return
        }
        setImagemCapa(image.path);
    })
        .catch(error => {
            console.log(error)
            setMensagemCadastro('Ops, erro ao selecionar foto da Rifa')
        });
}

async function obterImagemCamera() {
    console.log('obterImagemCamera')
    setMensagemCadastro('')
    ImagePicker.openCamera({
        compressImageMaxWidth: 400,
        compressImageMaxHeight: 400,
        cropping: true,
        compressImageQuality: 0.9
    }).then(image => {
        console.log(image.path);
        setImagemCapa(image.path);
    })
        .catch(error => {
            console.log(error)
            setMensagemCadastro('Ops, erro ao selecionar foto da Rifa')
        });
}

const handleOptionSelect = (index, value) => {
    setGenero(value);
};

return (
    <SafeAreaView style={estilos.safeArea}>
        <Texto>
            Título
        </Texto>
        <Input
            autoCorrect={false}
            autoCaptalize='none'
            value={titulo}
            onChangeText={(text) => setTitulo(text)}
        />
        <Texto>
            Descricao
        </Texto>
        <Input
            autoCorrect={false}
            autoCaptalize='none'
            multiline={true}
            numberOfLines={8}
            maxLength={400}
            value={descricao}
            onChangeText={(text) => setdescricao(text)}
        />
        <Texto>
            Categoria
        </Texto>
        <View style={styles.container}>
            <ModalDropdown
                options={descricaoGenero}
                defaultValue={genero}
                onSelect={handleOptionSelect}
                style={styles.dropdown}
                textStyle={styles.dropdownText}
                dropdownStyle={styles.dropdownDropdown}
                dropdownTextStyle={styles.dropdownDropdownText}
            />
        </View>
        <Texto>
            Qtd de nrs da rifa (10, 100, 1000, 10000 ou 100000)
        </Texto>
        <InputQtd
            autoCorrect={false}
            keyboardType="numeric"
            value={qtdNrs}
            onChangeText={(text) => setQtdNrs(text)}
        />
        <Texto>
            Valor do bilhete R$
        </Texto>
        <InputQtd
            autoCorrect={false}
            keyboardType="numeric"
            value={vlrBilhete}
            onChangeText={(text) => setVlrBilhete(text)}
        />
        <Texto>
            Autorizacao
        </Texto>
        <InputQtd
            autoCorrect={false}
            autoCaptalize='none'
            value={autorizacao}
            onChangeText={(text) => setAutorizacao(text)}
        />
        <AreaCapa>
            <TouchableOpacity style={estilos.imagemCapa}
                onPress={() => selecionarCapa()}>
                <Image source={imagemCapa ? { uri: imagemCapa } : capabranca}
                    resizeMode={"cover"}
                    style={estilos.imagemCapa} />
            </TouchableOpacity>
            <Texto>
                Foto da rifa
            </Texto>
        </AreaCapa>
        <TextoMensagemCadastro>
            {mensagemCadastro}
        </TextoMensagemCadastro>
        <Botao onPress={disponibilizarRifa}>
            {load ? (
                <ActivityIndicator size={20} color='#FFF' />
            ) : (
                <Text>Disponibilizar Rifa</Text>
            )
            }
        </Botao>
    </SafeAreaView>
);
}
const styles = StyleSheet.create({
    container: {
        justifyContent: 'top',
        alignItems: 'center',
        height: 40,
    },
    dropdown: {
        width: 300,
        height: 40,
        borderWidth: 1,
        borderColor: '#D3D3D3',
        padding: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    dropdownText: {
        fontSize: 15,
    },
    dropdownDropdown: {
        width: 300,
        height: 200,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        marginLeft: 8,
    },
    dropdownDropdownText: {
        fontSize: 15,
    },
    moeda: {

    },
});